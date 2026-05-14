import React from 'react';
import DateCell from '@components/Search/SearchList/ListItem/DateCell';
import TextWithTooltip from '@components/TextWithTooltip';
import type {EditableProps} from '@components/Table/EditableCell/types';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import {getCreated as getTransactionCreated, isScanning} from '@libs/TransactionUtils';
import type TransactionDataCellProps from './TransactionDataCellProps';

type TransactionCreatedDateCellProps = TransactionDataCellProps &
    EditableProps<string> & {
        isLargeScreenWidth: boolean;
        suffixText?: string;
    };

function TransactionCreatedDateCell({transactionItem, shouldShowTooltip, isLargeScreenWidth, suffixText, canEdit, onSave}: TransactionCreatedDateCellProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();

    if (!isScanning(transactionItem)) {
        return (
            <DateCell
                canEdit={canEdit}
                date={getTransactionCreated(transactionItem)}
                onSave={onSave}
                showTooltip={shouldShowTooltip}
                isLargeScreenWidth={isLargeScreenWidth}
                suffixText={suffixText}
            />
        );
    }

    const scanningText = translate('iou.receiptStatusTitle');
    const displayText = suffixText ? `${scanningText} • ${suffixText}` : scanningText;

    return (
        <TextWithTooltip
            text={displayText}
            shouldShowTooltip={shouldShowTooltip}
            style={[styles.lineHeightLarge, styles.pre, styles.justifyContentCenter, isLargeScreenWidth ? undefined : styles.mutedNormalTextLabel, !!suffixText && styles.flexShrink1]}
        />
    );
}

export default TransactionCreatedDateCell;
