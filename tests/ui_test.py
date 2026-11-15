"""Browser integration checks. Start npm run dev (or npm start) first.
Requires Python 3.10+, playwright, and its Chromium browser.
BASE_URL and BROWSER_CHANNEL optionally select another local server/browser.
"""
import json
import os
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE_URL = sys.argv[1] if len(sys.argv) > 1 else os.environ.get('BASE_URL', 'http://127.0.0.1:5173')
OUT = Path('test-results')
OUT.mkdir(exist_ok=True)
checks = []


def passed(name):
    checks.append(name)
    print(f'PASS {name}')


with sync_playwright() as p:
    launch = {'headless': True}
    if os.environ.get('BROWSER_CHANNEL'):
        launch['channel'] = os.environ['BROWSER_CHANNEL']
    browser = p.chromium.launch(**launch)
    context = browser.new_context(viewport={'width': 1440, 'height': 1080}, permissions=['clipboard-read', 'clipboard-write'])
    page = context.new_page()
    errors = []
    console_errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)
    page.goto(BASE_URL)
    page.wait_for_load_state('networkidle')
    expect(page.get_by_role('heading', name='The writing room.')).to_be_visible()
    expect(page.get_by_role('button', name='Summarize text', exact=True)).to_be_disabled()
    expect(page.locator('#input-count')).to_have_text('0 words')
    page.screenshot(path=str(OUT / 'desktop-empty.png'), full_page=True)
    passed('initial empty state, word count, and disabled submit')

    source = page.get_by_role('textbox', name='Original text')
    source.fill('A focused writing session keeps this draft intact.')
    original_height = page.locator('.editor-body').bounding_box()['height']
    page.get_by_role('button', name='Enter focus view', exact=True).click()
    expect(page.get_by_role('heading', name='The writing room.')).not_to_be_visible()
    expect(page.get_by_role('heading', name='Text workspace', exact=True)).to_be_visible()
    assert page.locator('.editor-body').bounding_box()['height'] > original_height + 80
    expect(source).to_have_value('A focused writing session keeps this draft intact.')
    page.get_by_role('button', name='Exit focus view', exact=True).click()
    expect(page.get_by_role('heading', name='The writing room.')).to_be_visible()
    page.get_by_role('button', name='Clear text', exact=True).click()
    passed('Focus view expands writing space and preserves the draft')

    page.evaluate('navigator.clipboard.writeText("Paste this draft directly from the clipboard.")')
    page.get_by_role('button', name='Paste from clipboard', exact=True).click()
    expect(source).to_have_value('Paste this draft directly from the clipboard.')
    expect(source).to_be_focused()
    page.evaluate('navigator.clipboard.writeText("")')
    page.get_by_role('button', name='Paste from clipboard', exact=True).click()
    expect(page.locator('.paste-notice')).to_contain_text('clipboard has no text')
    expect(source).to_have_value('Paste this draft directly from the clipboard.')
    page.evaluate('window.originalClipboardRead = navigator.clipboard.readText.bind(navigator.clipboard); Object.defineProperty(navigator.clipboard, "readText", { configurable: true, value: async () => { throw new DOMException("Denied", "NotAllowedError"); } });')
    page.get_by_role('button', name='Paste from clipboard', exact=True).click()
    expect(page.locator('.paste-notice')).to_contain_text('Ctrl+V')
    page.evaluate('Object.defineProperty(navigator.clipboard, "readText", { configurable: true, value: window.originalClipboardRead });')
    page.get_by_role('button', name='Clear text', exact=True).click()
    passed('clipboard paste, empty clipboard, and permission-denied fallback')

    page.get_by_role('button', name='Quick guide').click()
    expect(page.get_by_role('dialog')).to_be_visible()
    page.keyboard.press('Escape')
    expect(page.get_by_role('dialog')).not_to_be_visible()
    passed('accessible quick guide opens and closes with Escape')

    source = page.get_by_role('textbox', name='Original text')
    source.fill('short')
    page.get_by_role('button', name='Summarize text', exact=True).click()
    expect(page.get_by_role('alert')).to_contain_text('at least 10 characters')
    source.fill('word ' * 4001)
    expect(page.get_by_role('button', name='Summarize text', exact=True)).to_be_disabled()
    expect(page.locator('#input-limit')).to_contain_text('limit exceeded')
    passed('short input validation and over-limit prevention')

    page.get_by_role('button', name='Try a sample', exact=True).click()
    assert 'small-team advantage' in source.input_value()
    assert int(page.locator('#input-count').inner_text().split()[0]) > 100
    source.press('Control+Enter')
    expect(page.get_by_role('status').filter(has_text='Creating your summary')).to_be_visible()
    expect(page.get_by_role('heading', name='Overview', exact=True)).to_be_visible(timeout=10000)
    expect(page.get_by_text('Demo result', exact=True)).to_be_visible()
    page.get_by_role('button', name='Copy output', exact=True).click()
    expect(page.get_by_role('button', name='Copied!', exact=True)).to_be_visible()
    copied = page.evaluate('navigator.clipboard.readText()')
    assert '18%' in copied and 'Takeaway' in copied
    with page.expect_download() as pending_download:
        page.get_by_role('button', name='Download output', exact=True).click()
    download = pending_download.value
    assert download.suggested_filename == 'promptly-summarize.txt'
    downloaded_text = Path(download.path()).read_text(encoding='utf-8')
    assert '18%' in downloaded_text and 'Takeaway' in downloaded_text
    expect(page.get_by_role('status').filter(has_text='Download started')).to_be_visible()
    passed('plain-text download contains the structured result')
    page.screenshot(path=str(OUT / 'desktop-summary.png'), full_page=True)
    concise = page.locator('.summary-text').inner_text()
    page.get_by_role('button', name='detailed', exact=True).click()
    expect(page.get_by_role('heading', name='Overview', exact=True)).not_to_be_visible()
    page.get_by_role('button', name='Summarize text', exact=True).click()
    expect(page.get_by_role('heading', name='Overview', exact=True)).to_be_visible()
    assert len(page.locator('.summary-text').inner_text()) > len(concise)
    passed('sample, keyboard submit, loading, structured summary, copy, and length change')

    page.get_by_role('button', name='Rewrite tool', exact=True).click()
    page.get_by_role('button', name='Try a sample', exact=True).click()
    rewrites = []
    for tone in ['professional', 'casual', 'concise', 'polished']:
        page.get_by_label('Writing tone', exact=True).select_option(tone)
        page.get_by_role('button', name='Rewrite text', exact=True).click()
        expect(page.locator('.rewritten-text')).to_be_visible()
        text = page.locator('.rewritten-text').inner_text()
        assert 'Thursday' in text
        rewrites.append(text)
    assert len(set(rewrites)) == 4
    page.screenshot(path=str(OUT / 'desktop-rewrite.png'), full_page=True)
    passed('all four rewrite tones preserve the deadline and produce distinct output')

    page.get_by_role('button', name='Extract tasks tool', exact=True).click()
    page.get_by_role('button', name='Try a sample', exact=True).click()
    page.get_by_role('button', name='Extract tasks', exact=True).click()
    expect(page.locator('.task-list-heading h3')).to_be_visible()
    expect(page.locator('.task')).to_have_count(4)
    expect(page.get_by_text('Unassigned', exact=True)).to_be_visible()
    page.locator('.task-heading input').first.check()
    expect(page.locator('.task-progress')).to_contain_text('1 of 4')
    page.locator('.task summary').first.click()
    expect(page.locator('.task blockquote').first).to_contain_text('Maya will')
    page.get_by_role('button', name='Copy output', exact=True).click()
    assert '[x] Finalize the homepage copy' in page.evaluate('navigator.clipboard.readText()')
    page.screenshot(path=str(OUT / 'desktop-tasks.png'), full_page=True)
    source.fill('It was a pleasant and sunny afternoon.')
    page.get_by_role('button', name='Extract tasks', exact=True).click()
    expect(page.get_by_role('heading', name='No action items found')).to_be_visible()
    passed('tasks, missing owner, checkboxes, exact evidence, copy, and no-task state')
    assert not console_errors, f'Unexpected console errors before simulated failures: {console_errors}'

    # Real UI recovery, using a simulated provider failure once, then the actual API.
    page.route('**/api/process', lambda route: route.fulfill(status=503, content_type='application/json', body=json.dumps({'error': {'message': 'The AI connection is unavailable.', 'requestId': 'ui-check'}})), times=1)
    page.get_by_role('button', name='Extract tasks', exact=True).click()
    expect(page.get_by_role('alert')).to_contain_text('AI connection is unavailable')
    page.get_by_role('button', name='Try again', exact=True).click()
    expect(page.get_by_role('heading', name='No action items found')).to_be_visible()
    passed('server error is actionable and retry succeeds')

    page.route('**/api/process', lambda route: route.abort(), times=1)
    page.get_by_role('button', name='Extract tasks', exact=True).click()
    expect(page.get_by_role('alert')).to_contain_text('Could not reach Promptly')
    passed('network failure produces a readable error')

    # Cancellation must prevent an in-flight result from appearing under a different tool.
    page.get_by_role('button', name='Try a sample', exact=True).click()
    page.get_by_role('button', name='Extract tasks', exact=True).click()
    expect(page.get_by_role('button', name='Cancel', exact=True)).to_be_visible()
    page.get_by_role('button', name='Cancel', exact=True).click()
    expect(page.get_by_role('heading', name='No tasks yet')).to_be_visible()
    page.wait_for_timeout(900)
    expect(page.locator('.task-list-heading h3')).not_to_be_visible()
    page.get_by_role('button', name='Extract tasks', exact=True).click()
    page.get_by_role('button', name='Rewrite tool', exact=True).click()
    page.wait_for_timeout(900)
    expect(page.get_by_role('heading', name='No rewrite yet')).to_be_visible()
    page.get_by_role('button', name='Rewrite text', exact=True).click()
    source.fill('This new text must invalidate the earlier request.')
    page.wait_for_timeout(900)
    expect(page.locator('.rewritten-text')).not_to_be_visible()
    passed('cancel, tool change, and input edits discard stale responses')

    # An HTML-looking source must be displayed as text, never executed.
    source.fill('<img src=x onerror="window.promptlyXss=true"> hello there.')
    page.get_by_role('button', name='Rewrite text', exact=True).click()
    expect(page.locator('.rewritten-text')).to_be_visible()
    assert page.evaluate('window.promptlyXss') is None
    assert '<img' in page.locator('.rewritten-text').inner_text()
    page.get_by_role('button', name='Clear text').click()
    expect(source).to_have_value('')
    expect(page.locator('#input-count')).to_have_text('0 words')
    passed('output is escaped text; clear resets editor and result')

    for width in [320, 390, 768, 1024, 1440]:
        page.set_viewport_size({'width': width, 'height': 900})
        if page.get_by_role('button', name='Show original text', exact=True).is_visible():
            page.get_by_role('button', name='Show original text', exact=True).click()
        assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'), f'overflow at {width}'
        expect(page.get_by_role('button', name='Rewrite text', exact=True)).to_be_visible()
        if width == 390:
            page.get_by_role('button', name='Try a sample', exact=True).click()
            page.get_by_role('button', name='Rewrite text', exact=True).click()
            expect(page.locator('.rewritten-text')).to_be_visible()
            page.screenshot(path=str(OUT / 'mobile-rewrite.png'), full_page=True)
    passed('320/390/768/1024/1440px layouts and mobile processing without overflow')

    page.emulate_media(reduced_motion='reduce')
    assert page.evaluate('matchMedia("(prefers-reduced-motion: reduce)").matches')
    assert not errors, f'Uncaught browser errors: {errors}'
    passed('reduced-motion preference and zero uncaught browser errors')

    # Gemini's result envelope must pass the real browser-side Zod contract.
    # This is a transport fixture, not a live Google request.
    page.set_viewport_size({'width': 1440, 'height': 1080})
    page.get_by_role('button', name='Extract tasks tool', exact=True).click()
    source.fill('Maya will review the copy.')
    gemini_result = {
        'mode': 'actions',
        'result': {'overview': 'One action item.', 'actionItems': [{
            'task': 'Review the copy', 'assignee': 'Maya', 'dueDate': None,
            'priority': 'unspecified', 'evidence': 'Maya will review the copy.'
        }]},
        'meta': {'provider': 'gemini', 'inputWords': 5, 'durationMs': 123, 'requestId': 'gemini-browser-check'}
    }
    page.route('**/api/process', lambda route: route.fulfill(status=200, content_type='application/json', body=json.dumps(gemini_result)), times=1)
    page.get_by_role('button', name='Extract tasks', exact=True).click()
    expect(page.get_by_text('Gemini result', exact=True)).to_be_visible()
    expect(page.locator('.task-list-heading h3')).to_be_visible()
    expect(page.locator('.demo-note')).to_have_count(0)
    expect(page.get_by_text('No deadline', exact=True)).to_be_visible()
    assert not errors, f'Uncaught browser errors: {errors}'
    passed('Gemini provider contract, result label, and structured task rendering (mocked transport)')

    # Locate exact evidence in a long source, then return to editing without losing output.
    long_source = ('Background context for the launch.\n' * 55) + 'Maya will review the copy.'
    source.fill(long_source)
    page.route('**/api/process', lambda route: route.fulfill(status=200, content_type='application/json', body=json.dumps(gemini_result)), times=1)
    page.get_by_role('button', name='Extract tasks', exact=True).click()
    expect(page.get_by_text('Gemini result', exact=True)).to_be_visible()
    page.locator('.task summary').first.click()
    page.get_by_role('button', name='Find in original', exact=True).click()
    expect(page.get_by_role('region', name='Highlighted original text')).to_be_focused()
    expect(page.locator('.source-reader mark')).to_have_text('Maya will review the copy.')
    assert page.locator('.source-reader').evaluate('(element) => element.scrollTop > 0')
    expect(page.get_by_text('Gemini result', exact=True)).to_be_visible()
    page.get_by_role('button', name='Edit text', exact=True).click()
    expect(source).to_have_value(long_source)
    expect(source).to_be_focused()
    page.set_viewport_size({'width':390,'height':844})
    page.get_by_role('button', name='Show result', exact=True).click()
    expect(page.get_by_text('Gemini result', exact=True)).to_be_visible()
    expect(source).not_to_be_visible()
    page.get_by_role('button', name='Find in original', exact=True).click()
    expect(page.get_by_role('button', name='Show original text', exact=True)).to_have_attribute('aria-pressed','true')
    expect(page.locator('.source-reader mark')).to_be_visible()
    expect(page.get_by_text('Gemini result', exact=True)).not_to_be_visible()
    page.screenshot(path=str(OUT / 'mobile-source-review.png'), full_page=True)
    page.get_by_role('button', name='Edit text', exact=True).click()
    source.fill('A changed draft invalidates the older result.')
    page.get_by_role('button', name='Show result', exact=True).click()
    expect(page.get_by_role('heading', name='No tasks yet')).to_be_visible()
    assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
    passed('exact source highlighting, scroll/focus restoration, mobile view switching, and edit invalidation')
    # A small, controlled history makes the new workflow easy to verify.
    page.set_viewport_size({'width': 1440, 'height': 900})
    page.get_by_role('button', name='Past tasks', exact=True).click()
    expect(page.get_by_role('dialog', name='Past tasks', exact=True)).to_be_visible()
    page.get_by_role('button', name='Clear all', exact=True).click()
    page.get_by_role('button', name='Keep tasks', exact=True).click()
    assert page.locator('.history-row').count() > 0
    page.get_by_role('button', name='Clear all', exact=True).click()
    page.get_by_role('button', name='Delete all', exact=True).click()
    expect(page.get_by_role('heading', name='A place to pick up again')).to_be_visible()
    page.keyboard.press('Escape')
    expect(page.get_by_role('button', name='Past tasks', exact=True)).to_be_focused()
    passed('past-task drawer, clear confirmation, empty state, and keyboard focus restoration')

    page.get_by_role('button', name='Summarize tool', exact=True).click()
    page.get_by_role('button', name='Try a sample', exact=True).click()
    original_source = source.input_value()
    page.get_by_role('button', name='Summarize text', exact=True).click()
    expect(page.locator('.summary-text')).to_be_visible()
    generated_summary = page.locator('.summary-text').inner_text()
    page.get_by_role('button', name='Edit result', exact=True).click()
    expect(page.get_by_role('textbox', name='Overview', exact=True)).to_be_focused()
    page.get_by_role('textbox', name='Overview', exact=True).fill('Reviewed summary with a clearer next step.')
    page.get_by_role('textbox', name='Key point 1', exact=True).fill('A personally reviewed key point.')
    page.get_by_role('textbox', name='Takeaway', exact=True).fill('Keep the work focused.')
    page.get_by_role('button', name='Done editing', exact=True).click()
    expect(page.locator('.summary-text')).to_have_text('Reviewed summary with a clearer next step.')
    expect(page.get_by_text('Edited by you', exact=True)).to_be_visible()
    expect(source).to_have_value(original_source)
    page.get_by_role('button', name='Copy output', exact=True).click()
    assert 'personally reviewed' in page.evaluate('navigator.clipboard.readText()')
    with page.expect_download() as pending:
        page.get_by_role('button', name='Download output', exact=True).click()
    assert 'Keep the work focused.' in Path(pending.value.path()).read_text(encoding='utf-8')
    page.get_by_role('button', name='Reset edits', exact=True).click()
    expect(page.locator('.summary-text')).to_have_text(generated_summary)
    expect(page.get_by_role('button', name='Reset edits', exact=True)).not_to_be_visible()
    passed('structured summary editing, focus, copy/download of edits, and immutable reset')

    page.get_by_role('button', name='Rewrite tool', exact=True).click()
    page.get_by_role('button', name='Try a sample', exact=True).click()
    page.get_by_label('Writing tone', exact=True).select_option('casual')
    rewrite_source = source.input_value()
    page.get_by_role('button', name='Rewrite text', exact=True).click()
    expect(page.locator('.rewritten-text')).to_be_visible()
    generated_rewrite = page.locator('.rewritten-text').inner_text()
    page.get_by_role('button', name='Show changes', exact=True).click()
    expect(page.get_by_role('region', name='Rewrite changes')).to_be_visible()
    assert page.locator('.diff-document ins').count() + page.locator('.diff-document del').count() > 0
    assert page.locator('.diff-document').evaluate('(el) => Array.from(el.childNodes).filter(n => n.nodeName !== "INS").map(n => n.textContent).join("")') == rewrite_source
    assert page.locator('.diff-document').evaluate('(el) => Array.from(el.childNodes).filter(n => n.nodeName !== "DEL").map(n => n.textContent).join("")') == generated_rewrite
    page.get_by_role('button', name='Hide changes', exact=True).click()
    page.get_by_role('button', name='Edit result', exact=True).click()
    page.get_by_role('textbox', name='Rewritten text', exact=True).fill('My reviewed rewrite. Please send the draft by Thursday.')
    page.get_by_role('button', name='Done editing', exact=True).click()
    expect(page.locator('.rewritten-text')).to_have_text('My reviewed rewrite. Please send the draft by Thursday.')
    page.get_by_role('button', name='Show changes', exact=True).click()
    assert page.locator('.diff-document').evaluate('(el) => Array.from(el.childNodes).filter(n => n.nodeName !== "DEL").map(n => n.textContent).join("")') == 'My reviewed rewrite. Please send the draft by Thursday.'
    page.get_by_role('button', name='Hide changes', exact=True).click()
    passed('rewrite comparison reconstructs exact source/result and follows user edits')

    page.get_by_role('button', name='Extract tasks tool', exact=True).click()
    page.get_by_role('button', name='Try a sample', exact=True).click()
    page.get_by_role('button', name='Extract tasks', exact=True).click()
    expect(page.locator('.task')).to_have_count(4)
    page.get_by_role('button', name='Edit result', exact=True).click()
    page.get_by_role('textbox', name='Task 1 text', exact=True).fill('Review and finalize the homepage copy')
    page.get_by_role('textbox', name='Task 1 owner', exact=True).fill('Avery')
    page.get_by_role('textbox', name='Task 1 deadline', exact=True).fill('Friday')
    page.get_by_label('Task 1 priority', exact=True).select_option('low')
    page.get_by_role('button', name='Done editing', exact=True).click()
    expect(page.locator('.task-heading strong').first).to_have_text('Review and finalize the homepage copy')
    expect(page.locator('.task').first).to_contain_text('Avery')
    page.locator('.task-heading input').first.check()
    page.get_by_role('checkbox', name='Hide completed', exact=True).check()
    expect(page.locator('.task')).to_have_count(3)
    expect(page.locator('.task-progress')).to_have_text('1 of 4 complete')
    page.get_by_role('button', name='Copy output', exact=True).click()
    copied = page.evaluate('navigator.clipboard.readText()')
    assert '[x] Review and finalize' in copied and 'Avery' in copied
    while page.locator('.task-heading input').count():
        remaining = page.locator('.task-heading input').count()
        page.locator('.task-heading input').first.click()
        expect(page.locator('.task-heading input')).to_have_count(remaining - 1)
    expect(page.locator('.tasks-finished')).to_be_visible()
    expect(page.locator('.task-progress')).to_have_text('4 of 4 complete')
    page.get_by_role('checkbox', name='Hide completed', exact=True).uncheck()
    expect(page.locator('.task')).to_have_count(4)
    page.locator('.task summary').first.click()
    expect(page.locator('.task blockquote').first).to_contain_text('Maya will')
    passed('task editing, preserved source evidence, derived progress, filtering, and all-complete state')

    api_calls = []
    page.on('request', lambda request: api_calls.append(request.url) if '/api/process' in request.url else None)
    page.reload()
    page.get_by_role('button', name='Past tasks', exact=True).click()
    expect(page.locator('.history-row')).to_have_count(3)
    page.get_by_label('Filter past tasks').select_option('actions')
    expect(page.locator('.history-row')).to_have_count(1)
    expect(page.locator('.history-row')).to_contain_text('4 of 4 complete')
    page.locator('.history-open').first.click()
    expect(page.locator('.task-progress')).to_have_text('4 of 4 complete')
    expect(page.locator('.task').first).to_contain_text('Avery')
    expect(page.locator('.task-heading input').first).to_be_checked()
    assert not api_calls, 'Opening a saved result must not call the AI'
    page.get_by_role('button', name='Past tasks', exact=True).click()
    page.get_by_label('Filter past tasks').select_option('rewrite')
    page.locator('.history-open').first.click()
    expect(page.locator('.rewritten-text')).to_have_text('My reviewed rewrite. Please send the draft by Thursday.')
    expect(page.get_by_label('Writing tone', exact=True)).to_have_value('casual')
    expect(source).to_have_value(rewrite_source)
    page.get_by_role('button', name='Reset edits', exact=True).click()
    expect(page.locator('.rewritten-text')).to_have_text(generated_rewrite)
    assert not api_calls
    passed('history survives reload and restores source, preferences, edits, and completion without AI calls')

    # Reopening a saved result also cancels any in-flight request.
    page.get_by_role('button', name='Rewrite text', exact=True).click()
    page.get_by_role('button', name='Past tasks', exact=True).click()
    page.get_by_label('Filter past tasks').select_option('summarize')
    page.locator('.history-open').first.click()
    expect(page.locator('.summary-text')).to_have_text(generated_summary)
    page.wait_for_timeout(1000)
    expect(page.locator('.summary-text')).to_have_text(generated_summary)
    page.get_by_role('button', name='Past tasks', exact=True).click()
    page.get_by_label('Filter past tasks').select_option('all')
    page.locator('.history-delete').filter(has=page.locator('svg')).first.click()
    expect(page.locator('.history-row')).to_have_count(2)
    page.get_by_role('button', name='Clear all', exact=True).click()
    page.get_by_role('button', name='Delete all', exact=True).click()
    page.keyboard.press('Escape')
    page.get_by_role('button', name='Edit result', exact=True).click()
    page.get_by_role('textbox', name='Overview', exact=True).fill('This stays open after deleting history.')
    page.get_by_role('button', name='Done editing', exact=True).click()
    assert page.evaluate('localStorage.getItem("promptly.history.v1")') is None
    page.get_by_role('button', name='Past tasks', exact=True).click()
    expect(page.locator('.history-row')).to_have_count(0)
    page.keyboard.press('Escape')
    passed('reopen cancels stale requests; delete/clear persist without resurrecting an open result')

    # Match the main screen's accessible one-pane phone workflow.
    for width in [320, 390, 768, 1440]:
        page.set_viewport_size({'width': width, 'height': 900})
        if page.get_by_role('button', name='Show result', exact=True).is_visible():
            page.get_by_role('button', name='Show result', exact=True).click()
        page.get_by_role('button', name='Edit result', exact=True).click()
        expect(page.get_by_role('textbox', name='Overview', exact=True)).to_be_visible()
        assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'), f'edit overflow at {width}'
        page.get_by_role('button', name='Done editing', exact=True).click()
        page.get_by_role('button', name='Past tasks', exact=True).click()
        expect(page.get_by_role('heading', name='Past tasks', exact=True)).to_be_visible()
        assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'), f'history overflow at {width}'
        page.keyboard.press('Escape')
    passed('responsive result editor and accessible history drawer at 320/390/768/1440px')

    isolated = browser.new_context(viewport={'width': 390, 'height': 844})
    isolated.add_init_script("Object.defineProperty(Storage.prototype, 'setItem', {value: function() { throw new DOMException('Quota', 'QuotaExceededError'); }});")
    denied = isolated.new_page()
    denied.goto(BASE_URL)
    denied.get_by_role('button', name='Try a sample', exact=True).click()
    denied.get_by_role('button', name='Summarize text', exact=True).click()
    expect(denied.locator('.summary-text')).to_be_visible()
    expect(denied.get_by_text('History may not be saved', exact=True)).to_be_visible()
    denied.get_by_role('button', name='Past tasks', exact=True).click()
    expect(denied.locator('.history-notice')).to_contain_text('session only')
    expect(denied.locator('.history-row')).to_have_count(1)
    isolated.close()
    passed('storage quota failure keeps generated output and session history usable')
    assert not errors, f'Uncaught browser errors: {errors}'
    browser.close()

(OUT / 'ui-report.json').write_text(json.dumps({'baseUrl': BASE_URL, 'passed': len(checks), 'checks': checks}, indent=2), encoding='utf-8')
print(f'All {len(checks)} browser scenarios passed.')
