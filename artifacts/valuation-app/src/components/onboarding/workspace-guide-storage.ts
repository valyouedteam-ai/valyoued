export const WORKSPACE_BEHAVIOR_INFO_STORAGE_KEY = "valyoued.workspaceBehaviorInfoDismissed";

export function isWorkspaceGuideCompleted(): boolean {
  try {
    return localStorage.getItem(WORKSPACE_BEHAVIOR_INFO_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function completeWorkspaceGuide(): void {
  try {
    localStorage.setItem(WORKSPACE_BEHAVIOR_INFO_STORAGE_KEY, "1");
  } catch {
    /* localStorage may be unavailable */
  }
}
