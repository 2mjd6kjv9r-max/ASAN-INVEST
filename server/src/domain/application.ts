export function assertLinkedApplication(projectId?: string | null, profileId?: string | null): void {
  const hasProject = Boolean(projectId);
  const hasProfile = Boolean(profileId);
  if (hasProject === hasProfile && !(hasProject && hasProfile)) {
    // Z-02: must have a project, or a profile when there is no project.
    // Both is allowed (project implies profile via owner), but neither is invalid.
  }
  if (!hasProject && !hasProfile) {
    const error = new Error("Every application must be linked to a project or a profile");
    Object.assign(error, { code: "UNLINKED_APPLICATION" });
    throw error;
  }
}

export function nextApplicationNumber(year: number, sequence: number): string {
  return `INV-${year}-${sequence.toString().padStart(5, "0")}`;
}
