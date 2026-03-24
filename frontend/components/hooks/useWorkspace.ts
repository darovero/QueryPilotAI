import { useState, useEffect } from "react";
import { Organization } from "../types";
import { toast } from "sonner";

export function useWorkspace(userId: string | undefined, fetchWithAuth: (url: string, options?: any) => Promise<Response>) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoadingOrg, setIsLoadingOrg] = useState(true);
  const [isAddingWorkspace, setIsAddingWorkspace] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchWithAuth('/api/organizations/me')
        .then(res => res.ok ? res.json() : [])
        .then(data => {
           const orgs = Array.isArray(data) ? data : (data ? [data] : []);
           setOrganizations(orgs);
           setOrganization(orgs[0] || null);
           setIsLoadingOrg(false);
        })
        .catch(() => setIsLoadingOrg(false));
    } else {
        setIsLoadingOrg(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleOnboardingComplete = async (orgData: { name: string; industry: string }) => {
    try {
      const res = await fetchWithAuth('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orgData)
      });
      if (res.ok) {
        const data = await res.json();
        const newOrg = { id: data.id, ...orgData };
        setOrganizations(prev => [...prev, newOrg]);
        setOrganization(newOrg);
        setIsAddingWorkspace(false);
        toast.success("Workspace created successfully!");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to create workspace.");
      }
    } catch (err) {
      toast.error("Error creating workspace.");
    }
  };
  
  const handleDeleteWorkspace = async () => {
    if (!organization) return;
    if (!confirm("Are you sure you want to delete this workspace? This cannot be undone.")) return;
    try {
      const res = await fetchWithAuth(`/api/organizations/${organization.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success("Workspace deleted successfully.");
        setOrganizations(prev => {
            const nextOrgs = prev.filter(o => o.id !== organization.id);
            setOrganization(nextOrgs[0] || null);
            return nextOrgs;
        });
      } else {
        toast.error("Failed to delete workspace.");
      }
    } catch {
      toast.error("Error deleting workspace.");
    }
  };

  return {
    organizations,
    setOrganizations,
    organization,
    setOrganization,
    isLoadingOrg,
    setIsLoadingOrg,
    isAddingWorkspace,
    setIsAddingWorkspace,
    handleOnboardingComplete,
    handleDeleteWorkspace
  };
}
