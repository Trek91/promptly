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
    expect(page.get_by_role('heading', name='Text workspace')).to_be_visible()
    expect(page.get_by_role('button', name='Summarize text', exact=True)).to_be_disabled()
    expect(page.locator('#input-count')).to_have_text('0 words')
    page.screenshot(path=str(OUT / 'desktop-empty.png'), full_page=True)
    passed('initial empty state, word count, and disabled submit')

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
    page.get_by_role('checkbox').first.check()
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
    browser.close()

(OUT / 'ui-report.json').write_text(json.dumps({'baseUrl': BASE_URL, 'passed': len(checks), 'checks': checks}, indent=2), encoding='utf-8')
print(f'All {len(checks)} browser scenarios passed.')
