import { getUrlParams, objectToQueryString } from "../tools/query-param-tools";
import { getRevisionIdsNeededForDisplay } from "../tools/revision-history";
import {
  getRevisionList,
  getRevisions
} from "../../shared/server-api/revisions";
import {
  getNotebookID,
  getUserDataFromDocument,
  isLoggedIn
} from "../tools/server-tools";

import { iomdParser } from "../iomd-tools/iomd-parser";
import { getChunkContainingLine } from "../iomd-tools/iomd-selection";

import { addAppMessageToConsoleHistory } from "./console-message-actions";

export function updateAppMessages(messageObj) {
  return dispatch => {
    const { message } = messageObj;
    let { messageType, when } = messageObj;
    if (when === undefined) when = new Date().toString();
    if (messageType === undefined) messageType = message;
    // add to eval history.
    dispatch(addAppMessageToConsoleHistory(messageType));
    dispatch({
      type: "UPDATE_APP_MESSAGES",
      message: { message, messageType, when }
    });
  };
}

export function updateIomdContent(text) {
  return (dispatch, getState) => {
    const iomdChunks = iomdParser(text);
    const languageDefinitions = getState().languageDefinitions || {};
    const reportChunkTypes = Object.keys(languageDefinitions).concat([
      "md",
      "html",
      "css"
    ]);
    const reportChunks = iomdChunks
      .filter(c => reportChunkTypes.includes(c.chunkType))
      .map(c => ({
        chunkContent: c.chunkContent,
        chunkType: c.chunkType,
        chunkId: c.chunkId,
        evalFlags: c.evalFlags
      }));

    dispatch({
      // this dispatch really just forwards to the eval frame
      type: "UPDATE_MARKDOWN_CHUNKS",
      reportChunks
    });
    dispatch({
      type: "UPDATE_IOMD_CONTENT",
      iomd: text,
      iomdChunks
    });
  };
}

export function toggleWrapInEditors() {
  return { type: "TOGGLE_WRAP_IN_EDITORS" };
}

export function saveNotebook() {
  return {
    type: "SAVE_NOTEBOOK"
  };
}

export function resetNotebook(userData = undefined) {
  // NB: this action creator is not used in the code, but is useful for tests
  return {
    type: "RESET_NOTEBOOK",
    userData: userData && getUserDataFromDocument()
  };
}

export function clearVariables() {
  return {
    type: "CLEAR_VARIABLES"
  };
}

export function updateTitle(title) {
  return dispatch => {
    dispatch({
      type: "UPDATE_NOTEBOOK_TITLE",
      title
    });
  };
}

export function setViewMode(viewMode) {
  return (dispatch, getState) => {
    const state = getState();
    const notebookId = getNotebookID(state);
    if (notebookId) {
      const params = getUrlParams();
      if (viewMode === "REPORT_VIEW") params.viewMode = "report";
      else delete params.viewMode;
      window.history.replaceState(
        {},
        "",
        `/notebooks/${notebookId}/?${objectToQueryString(params)}`
      );
    }
    dispatch({
      type: "SET_VIEW_MODE",
      viewMode
    });
  };
}

export function updateEditorCursor(line, col, forceUpdate = false) {
  return { type: "UPDATE_CURSOR", line, col, forceUpdate };
}

export function updateEditorSelections(selections) {
  return {
    type: "UPDATE_SELECTIONS",
    selections
  };
}

export function moveCursorToNextChunk() {
  return (dispatch, getState) => {
    const {
      editorSelections: selections,
      iomdChunks,
      editorCursor
    } = getState();
    const targetLine =
      selections.length === 0
        ? editorCursor.line
        : selections[selections.length - 1].end.line;

    const targetChunk = getChunkContainingLine(iomdChunks, targetLine);
    dispatch(updateEditorCursor(targetChunk.endLine + 1, 0, true));
  };
}

function getRequiredRevisionContent(state, dispatch) {
  const contentIdsNeeded = getRevisionIdsNeededForDisplay(
    state.notebookHistory
  );

  // if we don't need anything, just return here!!
  if (!contentIdsNeeded.length) {
    return;
  }

  dispatch({
    type: "GETTING_REVISION_CONTENT"
  });
  getRevisions(getNotebookID(state), contentIdsNeeded, isLoggedIn(state))
    .then(revisions => {
      // reduce the revisions array into an object whose keys
      // are revision ids, and whose body is the content of
      // the revisions
      const revisionContent = revisions.reduce(
        (acc, r) => Object.assign(acc, { [r.id]: r.content }),
        {}
      );
      dispatch({
        type: "GOT_REVISION_CONTENT",
        revisionContent
      });
    })
    .catch(() => {
      dispatch({ type: "ERROR_GETTING_REVISION_CONTENT" });
    });
}

export function updateSelectedRevisionId(selectedRevisionId) {
  return (dispatch, getState) => {
    dispatch({
      type: "UPDATE_NOTEBOOK_HISTORY_BROWSER_SELECTED_REVISION_ID",
      selectedRevisionId
    });
    getRequiredRevisionContent(getState(), dispatch);
  };
}

export function getNotebookRevisionList() {
  return (dispatch, getState) => {
    dispatch({ type: "GETTING_NOTEBOOK_REVISION_LIST" });
    getRevisionList(getNotebookID(getState()), isLoggedIn(getState()))
      .then(revisionList => {
        dispatch({
          type: "GOT_NOTEBOOK_REVISION_LIST",
          revisionList
        });
        getRequiredRevisionContent(getState(), dispatch);
      })
      .catch(() => {
        dispatch({ type: "ERROR_GETTING_NOTEBOOK_REVISION_LIST" });
      });
  };
}

export function setModalState(modalState) {
  return {
    type: "SET_MODAL_STATE",
    modalState
  };
}

export function updateNotebookInfo(notebookInfo) {
  return {
    type: "UPDATE_NOTEBOOK_INFO",
    notebookInfo
  };
}

export function toggleHistoryModal() {
  return (dispatch, getState) => {
    const modalState =
      getState().modalState === "HISTORY_MODAL"
        ? "MODALS_CLOSED"
        : "HISTORY_MODAL";
    dispatch(setModalState(modalState));
  };
}

export function toggleHelpModal() {
  return (dispatch, getState) => {
    const modalState =
      getState().modalState === "HELP_MODAL" ? "MODALS_CLOSED" : "HELP_MODAL";
    dispatch(setModalState(modalState));
  };
}

export function toggleFileModal() {
  return (dispatch, getState) => {
    const modalState =
      getState().modalState === "FILE_MODAL" ? "MODALS_CLOSED" : "FILE_MODAL";
    dispatch(setModalState(modalState));
  };
}

export function toggleEditorLink() {
  return {
    type: "TOGGLE_EDITOR_LINK"
  };
}

export function saveEnvironment(updateObj, update) {
  return {
    type: "SAVE_ENVIRONMENT",
    updateObj,
    update
  };
}
