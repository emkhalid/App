import type {SelectionListProps} from '@components/SelectionList/types';

import type useArrowKeyFocusManager from '@hooks/useArrowKeyFocusManager';
import type useSingleExecution from '@hooks/useSingleExecution';

import {isMobileChrome} from '@libs/Browser';
import {isTransactionGroupListItemType} from '@libs/SearchUIUtils';

import CONST from '@src/CONST';

import type {NativeSyntheticEvent, StyleProp, TextStyle, ViewStyle} from 'react-native';

import React from 'react';

import type {ExtendedTargetedEvent, ListItem, ModifiedMouseEvent, SelectableListItemProps} from './types';

type ListItemRendererProps<TItem extends ListItem> = Omit<SelectableListItemProps<TItem>, 'onSelectRow' | 'keyForList'> &
    Pick<SelectionListProps<TItem>, 'ListItem' | 'shouldIgnoreFocus' | 'shouldSingleExecuteRowSelect'> & {
        index: number;
        normalizedIndex?: number;
        selectRow: (item: TItem, indexToFocus?: number) => void;
        setFocusedIndex: ReturnType<typeof useArrowKeyFocusManager>[1];
        resetKeyboardNavigation?: () => void;
        singleExecution: ReturnType<typeof useSingleExecution>['singleExecution'];
        titleStyles?: StyleProp<TextStyle>;
        titleContainerStyles?: StyleProp<ViewStyle>;
        isLastItem?: boolean;
        shouldHighlightSelectedItem?: boolean;
        shouldPreventEnterKeySubmit?: boolean;
    };

function ListItemRenderer<TItem extends ListItem>({
    ListItem,
    item,
    index,
    normalizedIndex,
    isFocused,
    isDisabled,
    showTooltip,
    canSelectMultiple,
    onLongPressRow,
    shouldSingleExecuteRowSelect,
    selectRow,
    onSelectionButtonPress,
    onDismissError,
    rightHandSideComponent,
    isMultilineSupported,
    isAlternateTextMultilineSupported,
    alternateTextNumberOfLines,
    shouldIgnoreFocus,
    setFocusedIndex,
    resetKeyboardNavigation,
    shouldSyncFocus,
    titleNumberOfLines,
    wrapperStyle,
    titleStyles,
    singleExecution,
    titleContainerStyles,
    shouldHighlightSelectedItem,
    isFocusVisible,
    shouldDisableHoverStyle,
    shouldShowRightCaret,
    selectionButtonPosition,
    errorRowStyles,
    isLastItem,
    shouldPreventEnterKeySubmit = true,
}: ListItemRendererProps<TItem>) {
    const resetKeyboardNavigationForPointerEvent = (event?: ModifiedMouseEvent) => {
        if (event && event.key !== CONST.KEYBOARD_SHORTCUTS.ENTER.shortcutKey) {
            resetKeyboardNavigation?.();
        }
    };

    const handleOnSelectionButtonPress = () => {
        if (!onSelectionButtonPress) {
            return undefined;
        }
        if (isTransactionGroupListItemType(item)) {
            return (pressedItem: TItem, itemTransactions?: Parameters<typeof onSelectionButtonPress>[1], event?: ModifiedMouseEvent) => {
                resetKeyboardNavigationForPointerEvent(event);
                onSelectionButtonPress(pressedItem, itemTransactions);
            };
        }
        return (_pressedItem: TItem, _itemTransactions?: Parameters<typeof onSelectionButtonPress>[1], event?: ModifiedMouseEvent) => {
            resetKeyboardNavigationForPointerEvent(event);
            onSelectionButtonPress(item);
        };
    };

    return (
        <>
            <ListItem
                item={item}
                index={index}
                isFocused={isFocused}
                isDisabled={isDisabled}
                showTooltip={showTooltip}
                canSelectMultiple={canSelectMultiple}
                onLongPressRow={onLongPressRow}
                onSelectRow={(_item, _transactionPreviewData, event) => {
                    resetKeyboardNavigationForPointerEvent(event);
                    if (shouldSingleExecuteRowSelect) {
                        singleExecution(() => selectRow(item, index))();
                    } else {
                        selectRow(item, index);
                    }
                }}
                onSelectionButtonPress={handleOnSelectionButtonPress()}
                onDismissError={() => onDismissError?.(item)}
                shouldPreventEnterKeySubmit={shouldPreventEnterKeySubmit}
                rightHandSideComponent={rightHandSideComponent}
                keyForList={item.keyForList}
                isMultilineSupported={isMultilineSupported}
                isAlternateTextMultilineSupported={isAlternateTextMultilineSupported}
                alternateTextNumberOfLines={alternateTextNumberOfLines}
                titleNumberOfLines={titleNumberOfLines}
                onFocus={(event: NativeSyntheticEvent<ExtendedTargetedEvent>) => {
                    if (shouldIgnoreFocus || isDisabled) {
                        return;
                    }
                    // Prevent unexpected scrolling on mobile Chrome after the context menu closes by ignoring programmatic focus not triggered by direct user interaction.
                    if (isMobileChrome() && event.nativeEvent && !event.nativeEvent.sourceCapabilities) {
                        return;
                    }
                    setFocusedIndex(normalizedIndex ?? index);
                }}
                shouldSyncFocus={shouldSyncFocus}
                wrapperStyle={wrapperStyle}
                titleStyles={titleStyles}
                titleContainerStyles={titleContainerStyles}
                errorRowStyles={errorRowStyles}
                shouldHighlightSelectedItem={shouldHighlightSelectedItem}
                isFocusVisible={isFocusVisible}
                shouldDisableHoverStyle={shouldDisableHoverStyle}
                shouldShowRightCaret={shouldShowRightCaret}
                selectionButtonPosition={selectionButtonPosition}
                isLastItem={isLastItem}
            />
            {item.footerContent && item.footerContent}
        </>
    );
}

export default ListItemRenderer;
