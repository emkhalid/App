import type {ConfirmButtonOptions, ListItem} from '@components/SelectionList/types';

import useActiveElementRole from '@hooks/useActiveElementRole';
import useKeyboardShortcut from '@hooks/useKeyboardShortcut';

import CONST from '@src/CONST';

import type {RefObject} from 'react';
import type {GestureResponderEvent} from 'react-native';

import {useCallback} from 'react';

type UseSelectionListShortcutsParams<TItem extends ListItem> = {
    selectFocusedItem: () => void;
    getFocusedOption: () => TItem | undefined;
    confirmButtonOptions: ConfirmButtonOptions<TItem> | undefined;
    isActive: boolean;
    focusedIndex: number;
    disableKeyboardShortcuts: boolean;
    shouldStopPropagation: boolean | undefined;
    shouldBubble: boolean;
    isKeyboardNavigating: boolean;
    searchValue: string | undefined;
    isTextInputFocusedRef: RefObject<boolean>;
};

/** Registers a SelectionList's Enter / Ctrl+Enter shortcuts, disabling Enter while an interactive element is focused. */
function useSelectionListShortcuts<TItem extends ListItem>({
    selectFocusedItem,
    getFocusedOption,
    confirmButtonOptions,
    isActive,
    focusedIndex,
    disableKeyboardShortcuts,
    shouldStopPropagation,
    shouldBubble,
    isKeyboardNavigating,
    searchValue,
    isTextInputFocusedRef,
}: UseSelectionListShortcutsParams<TItem>) {
    const activeElementRole = useActiveElementRole();
    const disableEnterShortcut = activeElementRole && [CONST.ROLE.BUTTON, CONST.ROLE.CHECKBOX, CONST.ROLE.SWITCH].some((role) => role === activeElementRole);

    const handleEnter = useCallback(
        (event?: GestureResponderEvent | KeyboardEvent) => {
            const shouldConfirmFromIdleSearch =
                isTextInputFocusedRef.current && !searchValue?.trim() && !isKeyboardNavigating && !!confirmButtonOptions?.onConfirm && !confirmButtonOptions?.isDisabled;

            if (shouldConfirmFromIdleSearch) {
                confirmButtonOptions.onConfirm(event, getFocusedOption());
                return;
            }
            selectFocusedItem();
        },
        [confirmButtonOptions, getFocusedOption, isKeyboardNavigating, isTextInputFocusedRef, searchValue, selectFocusedItem],
    );

    useKeyboardShortcut(CONST.KEYBOARD_SHORTCUTS.ENTER, handleEnter, {
        captureOnInputs: true,
        shouldBubble,
        shouldStopPropagation,
        isActive: !disableKeyboardShortcuts && isActive && focusedIndex >= 0 && !disableEnterShortcut,
    });

    useKeyboardShortcut(
        CONST.KEYBOARD_SHORTCUTS.CTRL_ENTER,
        (e) => {
            if (confirmButtonOptions?.onConfirm) {
                confirmButtonOptions.onConfirm(e, getFocusedOption());
                return;
            }
            selectFocusedItem();
        },
        {
            captureOnInputs: true,
            shouldBubble,
            isActive: !disableKeyboardShortcuts && isActive && !confirmButtonOptions?.isDisabled,
        },
    );

    return handleEnter;
}

export default useSelectionListShortcuts;
