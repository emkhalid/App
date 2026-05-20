import type {OnyxEntry} from 'react-native-onyx';
import CONST from '@src/CONST';
import type {IntroSelected, OnboardingPurpose} from '@src/types/onyx';

/**
 * Returns true when the onboarding choice is one of the "track" variants
 * (TRACK_BUSINESS/TRACK_WORKSPACE, TRACK_PERSONAL, or the legacy PERSONAL_SPEND).
 * Note: TRACK_BUSINESS and TRACK_WORKSPACE share the same value ('newDotTrackWorkspace'),
 * so checking TRACK_BUSINESS covers both.
 * Extracted here so that adding a new track-type choice only requires one edit.
 */
function isTrackOnboardingChoice(choice: OnyxEntry<OnboardingPurpose>): choice is OnboardingPurpose {
    return choice === CONST.ONBOARDING_CHOICES.TRACK_BUSINESS || choice === CONST.ONBOARDING_CHOICES.TRACK_PERSONAL || choice === CONST.ONBOARDING_CHOICES.PERSONAL_SPEND;
}

function isSupportedPendingInviteOnboarding(introSelected: OnyxEntry<IntroSelected>): boolean {
    if (!introSelected?.inviteType || introSelected.isInviteOnboardingComplete) {
        return false;
    }

    const isInviteIOUorInvoice = introSelected.inviteType === CONST.ONBOARDING_INVITE_TYPES.IOU || introSelected.inviteType === CONST.ONBOARDING_INVITE_TYPES.INVOICE;
    const isInviteChoiceCorrect =
        introSelected.choice === CONST.ONBOARDING_CHOICES.ADMIN || introSelected.choice === CONST.ONBOARDING_CHOICES.SUBMIT || introSelected.choice === CONST.ONBOARDING_CHOICES.CHAT_SPLIT;

    return isInviteChoiceCorrect && !isInviteIOUorInvoice;
}

export default isTrackOnboardingChoice;
export {isSupportedPendingInviteOnboarding};
