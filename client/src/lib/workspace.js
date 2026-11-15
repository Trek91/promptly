export const initialWorkspace = { status: 'idle', request: 0, data: null, editedResult: null, completed: {}, error: null, entryId: null };

// Only the active request may transition into success/error. Generated output is immutable.
export function workspaceReducer(state, action) {
  switch (action.type) {
    case 'reset': return { ...initialWorkspace, request: action.request };
    case 'request': return { ...initialWorkspace, status: 'loading', request: action.request };
    case 'success': return state.status === 'loading' && state.request === action.request
      ? { ...state, status: 'success', data: action.data, entryId: action.entryId, savedInput: action.input, sourceText: action.sourceText, createdAt: action.createdAt } : state;
    case 'failure': return (state.status === 'loading' || state.status === 'idle') && state.request === action.request
      ? { ...initialWorkspace, status: 'error', request: action.request, error: action.error } : state;
    case 'edit': return state.status === 'success'
      ? { ...state, editedResult: JSON.stringify(action.result) === JSON.stringify(state.data.result) ? null : action.result } : state;
    case 'resetEdits': return { ...state, editedResult: null };
    case 'toggleTask': return state.status === 'success' && state.data.mode === 'actions' && state.data.result.actionItems[action.index]
      ? { ...state, completed: { ...state.completed, [action.index]: action.checked } } : state;
    case 'restore': return { ...initialWorkspace, status: 'success', request: action.request, data: action.entry.data, editedResult: action.entry.editedResult, completed: action.entry.completed, entryId: action.entry.id, savedInput: action.entry.input, sourceText: action.entry.sourceText, createdAt: action.entry.createdAt };
    case 'detachHistory': return { ...state, entryId: null };
    default: return state;
  }
}

export function visibleData(state) {
  return state.data && { ...state.data, result: state.editedResult || state.data.result };
}
