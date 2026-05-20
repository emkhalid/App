# Proposal

## What is the root cause of that problem?

The admin invite task is already defined correctly in `src/libs/actions/Welcome/OnboardingFlow.ts`. `onboardingAdminMessage` includes `reviewWorkspaceSettingsTask`.

https://github.com/Expensify/App/blob/28343e053b0574218be6e98ada2a12be16ed54a5/src/libs/actions/Welcome/OnboardingFlow.ts#L353-L356

The first problem is on the backend. When a user is invited or added to a workspace as an admin, the backend does not consistently update that user's `nvp_introSelected` to the admin workspace invite state. The frontend reads `NVP_INTRO_SELECTED` in `src/pages/inbox/ReportFetchHandler.tsx` and passes it to `openReport()`.

https://github.com/Expensify/App/blob/28343e053b0574218be6e98ada2a12be16ed54a5/src/pages/inbox/ReportFetchHandler.tsx#L79-L82

https://github.com/Expensify/App/blob/28343e053b0574218be6e98ada2a12be16ed54a5/src/pages/inbox/ReportFetchHandler.tsx#L141

If `nvp_introSelected` is still a stale non-admin choice, `openReport()` is called without an admin invite onboarding intent. `getGuidedSetupDataForOpenReport()` then cannot build the admin invite `guidedSetupData`, so Concierge does not receive the `Review your workspace settings` task.

The second problem is on the frontend. Even when `nvp_introSelected` is correct, `getGuidedSetupDataForOpenReport()` returns early whenever regular guided setup is complete.

https://github.com/Expensify/App/blob/28343e053b0574218be6e98ada2a12be16ed54a5/src/libs/actions/Report/index.ts#L1376-L1387

For an existing user invited as a workspace admin, `nvp_onboarding.hasCompletedGuidedSetupFlow` can already be true, but invite onboarding is still pending. The invite flow is controlled by `introSelected.isInviteOnboardingComplete`, not by regular guided setup completion.

The same state mixup exists in `src/pages/inbox/ReportFetchHandler.tsx`. The app-loading guard only waits for policy data when `!isOnboardingCompleted` is true.

https://github.com/Expensify/App/blob/28343e053b0574218be6e98ada2a12be16ed54a5/src/pages/inbox/ReportFetchHandler.tsx#L127-L139

For existing invited admins, this can skip the policy-data wait even though the workspace settings task link depends on loaded policy data.

## What changes do you think we should make in order to solve the problem?

On the backend, when a user is invited or added to a workspace as an admin, update that user's `nvp_introSelected` to the admin workspace invite state. Do not reset regular onboarding completion.

```diff
+nvp_introSelected: {
+    choice: CONST.ONBOARDING_CHOICES.ADMIN,
+    inviteType: CONST.ONBOARDING_INVITE_TYPES.WORKSPACE,
+    isInviteOnboardingComplete: false,
+}
```

This fixes the source of truth. The frontend should not infer invite onboarding from policy role data because any existing workspace admin could otherwise be treated as a new invite onboarding user.

In `src/libs/OnboardingUtils.ts`, add a shared helper for the exact FE state both call sites need: supported invite onboarding that is still pending.

https://github.com/Expensify/App/blob/28343e053b0574218be6e98ada2a12be16ed54a5/src/libs/OnboardingUtils.ts#L1-L16

```diff
 import type {OnyxEntry} from 'react-native-onyx';
 import CONST from '@src/CONST';
-import type {OnboardingPurpose} from '@src/types/onyx';
+import type {IntroSelected, OnboardingPurpose} from '@src/types/onyx';
 
 function isTrackOnboardingChoice(choice: OnyxEntry<OnboardingPurpose>): choice is OnboardingPurpose {
     return choice === CONST.ONBOARDING_CHOICES.TRACK_BUSINESS || choice === CONST.ONBOARDING_CHOICES.TRACK_PERSONAL || choice === CONST.ONBOARDING_CHOICES.PERSONAL_SPEND;
 }
 
+function isSupportedPendingInviteOnboarding(introSelected: OnyxEntry<IntroSelected>): boolean {
+    if (!introSelected?.inviteType || introSelected.isInviteOnboardingComplete) {
+        return false;
+    }
+
+    const isInviteIOUorInvoice = introSelected.inviteType === CONST.ONBOARDING_INVITE_TYPES.IOU || introSelected.inviteType === CONST.ONBOARDING_INVITE_TYPES.INVOICE;
+    const isInviteChoiceCorrect =
+        introSelected.choice === CONST.ONBOARDING_CHOICES.ADMIN || introSelected.choice === CONST.ONBOARDING_CHOICES.SUBMIT || introSelected.choice === CONST.ONBOARDING_CHOICES.CHAT_SPLIT;
+
+    return isInviteChoiceCorrect && !isInviteIOUorInvoice;
+}
+
 export default isTrackOnboardingChoice;
+export {isSupportedPendingInviteOnboarding};
```

This keeps the invite predicate consistent between report opening and guided setup generation.

In `src/pages/inbox/ReportFetchHandler.tsx`, use that helper for the app-loading guard and let the existing route-driven effect rerun when the deferred invite fetch becomes ready.

https://github.com/Expensify/App/blob/28343e053b0574218be6e98ada2a12be16ed54a5/src/pages/inbox/ReportFetchHandler.tsx#L127-L139

```diff
+import {isSupportedPendingInviteOnboarding} from '@libs/OnboardingUtils';
+
-const [onboarding] = useOnyx(ONYXKEYS.NVP_ONBOARDING);
 const [isLoadingApp] = useOnyx(ONYXKEYS.IS_LOADING_APP);
```

```diff
-const isInviteOnboardingComplete = introSelected?.isInviteOnboardingComplete ?? false;
-const isOnboardingCompleted = onboarding?.hasCompletedGuidedSetupFlow ?? false;
+const shouldDeferInviteOnboardingOpenReport = !!isLoadingApp && isSupportedPendingInviteOnboarding(introSelected);
```

```diff
-if (isLoadingApp && introSelected && !isOnboardingCompleted && !isInviteOnboardingComplete) {
-    const {choice, inviteType} = introSelected;
-    const isInviteIOUorInvoice = inviteType === CONST.ONBOARDING_INVITE_TYPES.IOU || inviteType === CONST.ONBOARDING_INVITE_TYPES.INVOICE;
-    const isInviteChoiceCorrect = choice === CONST.ONBOARDING_CHOICES.ADMIN || choice === CONST.ONBOARDING_CHOICES.SUBMIT || choice === CONST.ONBOARDING_CHOICES.CHAT_SPLIT;
-
-    if (isInviteChoiceCorrect && !isInviteIOUorInvoice) {
-        return;
-    }
+if (shouldDeferInviteOnboardingOpenReport) {
+    return;
 }
```

Also update the existing route-driven effect.

https://github.com/Expensify/App/blob/28343e053b0574218be6e98ada2a12be16ed54a5/src/pages/inbox/ReportFetchHandler.tsx#L257-L262

```diff
 useEffect(() => {
     // This function is triggered when a user clicks on a link to navigate to a report.
     // For each link click, we retrieve the report data again, even though it may already be cached.
     // There should be only one openReport execution per page start or navigating
+    if (shouldDeferInviteOnboardingOpenReport) {
+        return;
+    }
     fetchReport();
-}, [route, isLinkedMessagePageReady, reportActionIDFromRoute]);
+}, [route, isLinkedMessagePageReady, reportActionIDFromRoute, shouldDeferInviteOnboardingOpenReport]);
```

This preserves the policy-data wait from the existing guard, but applies it to pending invite onboarding regardless of regular guided setup completion.

In `src/libs/actions/Report/index.ts`, use the same helper so pending invite onboarding can generate `guidedSetupData` even when regular guided setup is already complete.

https://github.com/Expensify/App/blob/28343e053b0574218be6e98ada2a12be16ed54a5/src/libs/actions/Report/index.ts#L1376-L1408

```diff
+import {isSupportedPendingInviteOnboarding} from '@libs/OnboardingUtils';
+
-const isInviteOnboardingComplete = introSelected?.isInviteOnboardingComplete ?? false;
-const isOnboardingCompleted = hasCompletedGuidedSetupFlow ?? onboarding?.hasCompletedGuidedSetupFlow ?? false;
-
 // Some cases we can have two open report requests with guide setup data because isInviteOnboardingComplete is not updated completely.
 // Then we need to check the list request and prevent the guided setup data from being duplicated.
 const allPersistedRequests = getAll();
 const hasOpenReportWithGuidedSetupData = allPersistedRequests.some((request) => request.command === WRITE_COMMANDS.OPEN_REPORT && request.data?.guidedSetupData);
 
-// Prepare guided setup data only when nvp_introSelected is set and onboarding is not completed
-// OldDot users will never have nvp_introSelected set, so they will not see guided setup messages
-if (!introSelected || isOnboardingCompleted || isInviteOnboardingComplete || hasOpenReportWithGuidedSetupData) {
-    return undefined;
-}
-
-const {choice, inviteType} = introSelected;
-const isInviteIOUorInvoice = inviteType === CONST.ONBOARDING_INVITE_TYPES.IOU || inviteType === CONST.ONBOARDING_INVITE_TYPES.INVOICE;
-const isInviteChoiceCorrect = choice === CONST.ONBOARDING_CHOICES.ADMIN || choice === CONST.ONBOARDING_CHOICES.SUBMIT || choice === CONST.ONBOARDING_CHOICES.CHAT_SPLIT;
-
-if (!isInviteChoiceCorrect || isInviteIOUorInvoice) {
+// Prepare guided setup data only when nvp_introSelected is set for invite onboarding.
+// OldDot users will never have nvp_introSelected set, so they will not see guided setup messages.
+if (!isSupportedPendingInviteOnboarding(introSelected) || hasOpenReportWithGuidedSetupData) {
     return undefined;
 }
 
+const {choice} = introSelected;
 const onboardingMessage = getOnboardingMessages().onboardingMessages[choice];
```

```diff
 const onboardingData = prepareOnboardingOnyxData({
     introSelected,
     engagementChoice: choice,
     onboardingMessage,
     companySize: introSelected?.companySize as OnboardingCompanySize,
     isSelfTourViewed,
     hasCompletedGuidedSetupFlow,
+    wasInvited: true,
     betas,
 });
```

This keeps duplicate protection through `isInviteOnboardingComplete` and queued `OpenReport` requests, while preventing regular onboarding completion from suppressing invite onboarding. Passing `wasInvited: true` also keeps invite onboarding from marking normal guided setup as newly completed.

## What alternative solutions did you explore? (Optional)

I considered deriving the admin invite state from policy role data on the frontend. I rejected that because an existing workspace admin opening Concierge is not always a new invite onboarding user. The backend should own the invite intent by writing the correct `nvp_introSelected`.

I considered making this a backend-only fix. I rejected that because even with the correct backend state, the existing frontend still uses regular guided setup completion in the invite onboarding guards.

I considered duplicating the invite predicate directly in `ReportFetchHandler.tsx` and `Report/index.ts`. I rejected that because these two call sites must stay aligned; a shared helper is easier to review and less likely to drift.
