import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@material-ui/core';
import React, { useEffect, useState } from 'react';
import { Events } from '../services/Events';

function UtsDialog() {
  const [dialog, setDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    onDeny: null,
  });

  /**
   * @param {boolean} didConfirm
   */
  function closeDialog(didConfirm) {
    const callback = didConfirm ? dialog.onConfirm : dialog.onDeny;
    setDialog(prevDialog => ({
      ...prevDialog,
      isOpen: false,
    }));
    if (callback) {
      callback();
    }
  }

  useEffect(() => {
    function startListeners() {
      Events.subscribe(Events.DIALOG_SHOW, showDialog);
    }

    function stopListeners() {
      Events.unsubscribe(Events.DIALOG_SHOW, showDialog);
    }

    /**
     * @param {Object} data
     */
    function showDialog(data) {
      setDialog({
        isOpen: true,
        title: data.title,
        message: data.message,
        onConfirm: data.onConfirm,
        onDeny: data.onDeny,
      });
    }

    startListeners();
    return stopListeners;
  }, []);

  return (
    <Dialog
      onClose={() => closeDialog(false)}
      open={dialog.isOpen}
    >
      <DialogTitle>{dialog.title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{dialog.message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button
          color="primary"
          onClick={() => closeDialog(false)}
        >
          {browser.i18n.getMessage('no')}
        </Button>
        <Button
          color="primary"
          onClick={() => closeDialog(true)}
          variant="contained"
        >
          {browser.i18n.getMessage('yes')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export { UtsDialog };