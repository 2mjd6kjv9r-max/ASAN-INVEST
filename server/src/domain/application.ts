/** Z-02: an application links to a project XOR a profile. */
export function assertLinkedApplication(projectId?: string | null, profileId?: string | null): void {
  const hasProject = Boolean(projectId);
  const hasProfile = Boolean(profileId);
  if (hasProject === hasProfile) {
    const error = new Error("Every application must be linked to a project or a profile, not both");
    Object.assign(error, { code: "UNLINKED_APPLICATION" });
    throw error;
  }
}

export function nextApplicationNumber(year: number, sequence: number): string {
  return `INV-${year}-${sequence.toString().padStart(5, "0")}`;
}
