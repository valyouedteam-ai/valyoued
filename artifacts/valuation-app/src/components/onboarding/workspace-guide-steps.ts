export type WorkspaceGuideStep = {
  id: string;
  /** Matches `data-workspace-guide` on a DOM node. Omit for a centered intro card. */
  target?: string;
  title: string;
  body: string;
  /** When true, the highlighted control stays clickable through the overlay hole. */
  interactive?: boolean;
  /** Auto-advance when this step's target is not in the DOM. */
  skipIfMissing?: boolean;
  /** Preferred popover placement relative to the target. */
  placement?: "top" | "bottom";
};

export function buildWorkspaceGuideSteps(isMobile: boolean): WorkspaceGuideStep[] {
  const steps: WorkspaceGuideStep[] = [
    {
      id: "intro",
      title: "How ValYoued is organized",
      body: "Workspaces stay separate, and navigation tabs always respect the workspace you have active. This short tour points at the controls you will use most.",
    },
    {
      id: isMobile ? "mobile-menu" : "main-nav",
      target: isMobile ? "mobile-menu" : "main-nav",
      title: isMobile ? "Open the menu to move around" : "Your workspace tabs live here",
      body: isMobile
        ? "Portfolio, Valuate, Recent, Inheritance, and Insights open from the menu. When you valuate, pick portfolio workspace on the Region step so the asset lands in the right workspace."
        : "Portfolio, Valuate, and Recent are scoped to your active workspace. Try opening a tab to see how the shell follows you.",
      interactive: true,
      placement: "bottom",
    },
    {
      id: "workspace-strip",
      target: "workspace-strip",
      title: "Switch workspaces from the pills",
      body: "When you have more than one workspace, pick it here. Inheritance workspaces use violet styling so it is obvious which one you are in.",
      interactive: true,
      skipIfMissing: true,
      placement: "bottom",
    },
    {
      id: "nav-inheritance",
      target: "nav-inheritance",
      title: "Inheritance has its own lane",
      body: "Estates, heirs, and heirlooms stay on a separate inheritance workspace. Open this hub before valuing items that should not mix with your primary holdings.",
      interactive: true,
      skipIfMissing: true,
      placement: "bottom",
    },
    {
      id: "nav-valuate",
      target: "nav-valuate",
      title: "Run valuations from Valuate",
      body: "Start here when you add an item. On the Region step, pick portfolio workspace so the asset lands in the workspace you intend.",
      interactive: true,
      skipIfMissing: true,
      placement: "bottom",
    },
    {
      id: "settings",
      target: "settings",
      title: "Settings and add-ons",
      body: "Need the inheritance workspace permanently? Enable it as an optional add-on in Settings when you are ready to bill for it.",
      interactive: true,
      skipIfMissing: true,
      placement: "bottom",
    },
  ];

  if (isMobile) {
    return steps.filter((step) => step.id !== "nav-inheritance" && step.id !== "nav-valuate");
  }

  return steps;
}
