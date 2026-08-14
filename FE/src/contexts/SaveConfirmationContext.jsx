import { createContext, useCallback, useContext, useRef, useState } from 'react';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';

const SaveConfirmationContext = createContext(null);

const DEFAULT_OPTIONS = {
  title: 'Confirm changes',
  message: 'Please review the information before saving. This action will update system data.',
  confirmLabel: 'Yes, save',
  cancelLabel: 'No, go back',
};

export function SaveConfirmationProvider({ children }) {
  const [request, setRequest] = useState(null);
  const resolverRef = useRef(null);

  const confirmSave = useCallback((options = {}) => {
    resolverRef.current?.(false);
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setRequest({ ...DEFAULT_OPTIONS, ...options });
    });
  }, []);

  const finish = useCallback((confirmed) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setRequest(null);
    resolve?.(confirmed);
  }, []);

  return (
    <SaveConfirmationContext.Provider value={confirmSave}>
      {children}
      <ConfirmDialog
        open={Boolean(request)}
        onClose={() => finish(false)}
        onConfirm={() => finish(true)}
        title={request?.title}
        message={request?.message}
        confirmLabel={request?.confirmLabel}
        cancelLabel={request?.cancelLabel}
        danger={request?.danger}
        layer={70}
      />
    </SaveConfirmationContext.Provider>
  );
}

export function useSaveConfirmation() {
  const confirmSave = useContext(SaveConfirmationContext);
  if (!confirmSave) {
    throw new Error('useSaveConfirmation must be used inside SaveConfirmationProvider');
  }
  return confirmSave;
}
