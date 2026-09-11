import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Opens a page's create dialog when it is reached with `?new=1`.
 *
 * The Topbar "+ Create" menu used to merely navigate to a list page, leaving the
 * user to find the create button themselves — and before these pages had one,
 * the menu item did nothing useful at all. The flag is consumed and stripped
 * from the URL so a refresh or a back-navigation does not reopen the dialog.
 */
export function useCreateFromUrl(open) {
  const [params, setParams] = useSearchParams();

  useEffect(() => {
    if (params.get('new') !== '1') return;
    open();
    const next = new URLSearchParams(params);
    next.delete('new');
    setParams(next, { replace: true });
  }, [params, setParams, open]);
}
