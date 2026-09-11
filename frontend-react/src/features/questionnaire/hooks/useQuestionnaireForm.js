import { useReducer, useMemo, useCallback, useState } from 'react';
import {
  emptyQuestionnaire, emptyAnswer, emptySubAnswer,
  emptyAssessorOption, emptyAssessorSubOption,
} from '../config/questionnaireSchema';
import { setAt, getAt, pushAt, removeAt, moveAt } from '../services/answerTree';
import { validateQuestionnaire, summariseScores } from '../services/questionnaireValidator';
import { toPayload, toForm } from '../services/questionnaireSerializer';
import { getType, typeHasConfig, typeAllowsSubAnswer } from '../types';

/**
 * FORM ENGINE for the questionnaire author.
 *
 * A reducer rather than a bag of useStates, for three reasons that all matter
 * once this grows into full questionnaire management:
 *
 *   1. Every edit is a named action, so autosave, undo/redo and an activity log
 *      are additions to one switch — not a rewrite of every handler.
 *   2. Nested edits go through `setAt(path)`, so the answer tree, the assessor
 *      options hanging off it, and the grid rows hanging off *those* all use
 *      the same four list actions. The Angular version had a method per level
 *      and stopped at two.
 *   3. State transitions are pure and live outside React, so they are testable
 *      without rendering anything.
 */

const ACTIONS = {
  SET_FIELD: 'SET_FIELD',
  SET_AT: 'SET_AT',
  LIST_ADD: 'LIST_ADD',
  LIST_REMOVE: 'LIST_REMOVE',
  LIST_MOVE: 'LIST_MOVE',
  TOGGLE_SUB_ANSWERS: 'TOGGLE_SUB_ANSWERS',
  SET_SUB_ANSWER_TYPE: 'SET_SUB_ANSWER_TYPE',
  UPDATE_GRID: 'UPDATE_GRID',
  REPLACE: 'REPLACE',
  RESET: 'RESET',
};

function reducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_FIELD:
      return { ...state, [action.name]: action.value };

    case ACTIONS.SET_AT:
      return setAt(state, action.path, action.value);

    /** Generic list append — answers, sub-answers, assessor options, formulas. */
    case ACTIONS.LIST_ADD:
      return pushAt(state, action.path, action.item);

    case ACTIONS.LIST_REMOVE:
      return removeAt(state, action.path, action.index);

    case ACTIONS.LIST_MOVE:
      return moveAt(state, action.path, action.from, action.to);

    /**
     * Switching Sub Answer to "no" hides the nested block but keeps the rows.
     * Toggling back restores what was typed — discarding it on every accidental
     * click is the kind of small loss that makes an authoring tool painful.
     * `toPayload` drops them when the flag is off, so nothing stale is stored.
     */
    case ACTIONS.TOGGLE_SUB_ANSWERS: {
      const answer = state.answers[action.index];
      const on = action.value;
      const seeded = on && (answer.subAnswers || []).length === 0
        ? [{
            ...emptySubAnswer(),
            subAnswerType: answer.subAnswerType || '',
            config: getType(answer.subAnswerType).createConfig(),
          }]
        : answer.subAnswers;
      return setAt(state, ['answers', action.index], {
        ...answer, hasSubAnswers: on, subAnswers: seeded,
      });
    }

    /**
     * Choosing Grid has to bring a table with it, otherwise the author sees a
     * type selected and nothing to fill in. Switching away keeps the built
     * table in state so a mis-click is recoverable; the serializer only writes
     * it while the type is still Grid.
     */
    case ACTIONS.SET_SUB_ANSWER_TYPE: {
      const path = action.path;
      const sub = getAt(state, path);
      // Choosing a type has to bring its configuration with it, or the author
      // sees a type selected and nothing to fill in. Switching away keeps what
      // was built so a mis-click is recoverable; the serializer only writes it
      // while that type is still selected.
      const needsConfig = typeHasConfig(action.value);
      return setAt(state, path, {
        ...sub,
        subAnswerType: action.value,
        config: needsConfig ? (sub.config || getType(action.value).createConfig()) : sub.config,
      });
    }

    /** Apply a pure operation to a type's configuration at `path`. */
    case ACTIONS.UPDATE_GRID: {
      const config = getAt(state, action.path);
      if (!config) return state;
      return setAt(state, action.path, action.apply(config));
    }

    case ACTIONS.REPLACE:
      return action.state;

    case ACTIONS.RESET:
      return emptyQuestionnaire();

    default:
      return state;
  }
}

export function useQuestionnaireForm(initialDoc) {
  const [form, dispatch] = useReducer(
    reducer,
    initialDoc,
    (doc) => (doc ? toForm(doc) : emptyQuestionnaire())
  );

  /**
   * Errors are computed on every render but only *shown* once a field is
   * touched or a submit was attempted — so a fresh form is not a wall of red,
   * while a failed submit still highlights everything at once.
   */
  const [touched, setTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const errors = useMemo(() => validateQuestionnaire(form), [form]);
  const scores = useMemo(() => summariseScores(form), [form]);

  const errorFor = useCallback(
    (path) => ((submitAttempted || touched[path]) ? errors[path] : undefined),
    [errors, touched, submitAttempted]
  );

  const touch = useCallback((path) => {
    setTouched((prev) => (prev[path] ? prev : { ...prev, [path]: true }));
  }, []);

  const api = useMemo(() => {
    const listAdd = (path, item) => dispatch({ type: ACTIONS.LIST_ADD, path, item });
    const listRemove = (path, index) => dispatch({ type: ACTIONS.LIST_REMOVE, path, index });

    return {
      setField: (name, value) => dispatch({ type: ACTIONS.SET_FIELD, name, value }),
      setAt: (path, value) => dispatch({ type: ACTIONS.SET_AT, path, value }),

      // Answers
      addAnswer: () => listAdd(['answers'], emptyAnswer()),
      removeAnswer: (index) => listRemove(['answers'], index),
      moveAnswer: (from, to) => dispatch({ type: ACTIONS.LIST_MOVE, path: ['answers'], from, to }),

      // Sub-answers. A new row inherits the parent's default type, and a Grid
      // row arrives with a table already built so the author never sees a type
      // selected with nothing to fill in.
      addSubAnswer: (index, defaultType = '') => listAdd(
        ['answers', index, 'subAnswers'],
        {
          ...emptySubAnswer(),
          subAnswerType: defaultType,
          config: getType(defaultType).createConfig(),
        }
      ),
      removeSubAnswer: (index, subIndex) => listRemove(['answers', index, 'subAnswers'], subIndex),
      toggleSubAnswers: (index, value) => dispatch({ type: ACTIONS.TOGGLE_SUB_ANSWERS, index, value }),
      setSubAnswerType: (path, value) => dispatch({ type: ACTIONS.SET_SUB_ANSWER_TYPE, path, value }),

      /**
       * Assessor options are path-driven, so the same three calls serve an
       * answer, a sub-answer and a grid row. Adding a fourth host later needs
       * no new action.
       */
      addAssessorOption: (path) => listAdd(path, emptyAssessorOption()),
      removeAssessorOption: (path, index) => listRemove(path, index),
      addAssessorSubOption: (path) => listAdd(path, emptyAssessorSubOption()),
      removeAssessorSubOption: (path, index) => listRemove(path, index),

      // Grid — `apply` is any pure function from gridModel
      updateGrid: (path, apply) => dispatch({ type: ACTIONS.UPDATE_GRID, path, apply }),

      /**
       * The formula builder hands back a complete list rather than emitting one
       * edit per click. Formulas are validated against each other (duplicate
       * targets, self-reference, cycles), so a half-applied list is not a
       * meaningful state to hold — the dialog commits or discards as a whole.
       */
      setFormulas: (path, formulas) =>
        dispatch({ type: ACTIONS.SET_AT, path: [...path, 'formulas'], value: formulas }),

      /**
       * Load a stored question into the form.
       *
       * Clears `touched` and `submitAttempted` along with it: a freshly opened
       * question has not been edited, so carrying the previous document's
       * error state over would greet the author with red fields they never
       * touched.
       */
      replace: (doc) => {
        dispatch({ type: ACTIONS.REPLACE, state: toForm(doc) });
        setTouched({});
        setSubmitAttempted(false);
      },
      reset: () => {
        dispatch({ type: ACTIONS.RESET });
        setTouched({});
        setSubmitAttempted(false);
      },
    };
  }, []);

  return {
    form,
    ...api,
    errors,
    errorFor,
    touch,
    touched,
    isValid: Object.keys(errors).length === 0,
    scores,
    allowsSubAnswers: typeAllowsSubAnswer(form.answerType),
    submitAttempted,
    markSubmitAttempted: () => setSubmitAttempted(true),
    buildPayload: () => toPayload(form),
  };
}
