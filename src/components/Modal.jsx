import { useEffect } from 'react';
import { CloseIcon } from './Icons';

export default function Modal({ title, onClose, children, wide, hideClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !hideClose && onClose?.();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose, hideClose]);

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && !hideClose && onClose?.()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          {!hideClose ? (
            <button className="icon-btn" onClick={onClose} aria-label="Close"><CloseIcon /></button>
          ) : <span />}
          <h2>{title}</h2>
          <span style={{ width: 32 }} />
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
