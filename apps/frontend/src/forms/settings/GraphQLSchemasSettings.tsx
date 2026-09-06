import { useEffect, useState } from 'react';
import { Database, FileText, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useGraphQLSchemaStore } from '../../store/graphql/store';
import { useAlertStore } from '../../store/alert/store';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Dialog } from '../../components/Dialog';
import { EmptyState } from '../../components/EmptyState';
import { GraphQLSchemaProfileForm } from '../GraphQLSchemaProfileForm';
import { useDialog, useConfirmDialog } from '../../hooks/useDialog';
import type {
  GraphQLSchemaCacheEntry,
  GraphQLSchemaProfile,
  GraphQLSchemaProfileInput,
} from '../../store/graphql/types';

const SOURCE_TYPE_LABELS: Record<GraphQLSchemaProfile['sourceType'], string> = {
  endpoint: 'Endpoint',
  sdl: 'SDL',
  'introspection-json': 'Introspection JSON',
};

const SOURCE_TYPE_BADGE_STYLES: Record<GraphQLSchemaProfile['sourceType'], string> = {
  endpoint: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  sdl: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  'introspection-json': 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
};

export function GraphQLSchemasSettings() {
  const { profiles, loading, loadProfiles, createProfile, updateProfile, deleteProfile, getCache } =
    useGraphQLSchemaStore();
  const { showAlert } = useAlertStore();

  const profileDialog = useDialog();
  const confirmDialog = useConfirmDialog();
  const [editingProfile, setEditingProfile] = useState<GraphQLSchemaProfile | undefined>();
  const [caches, setCaches] = useState<Record<string, GraphQLSchemaCacheEntry | null>>({});

  useEffect(() => {
    loadProfiles().catch(() => showAlert('Failed to load GraphQL schema profiles', 'error'));
  }, [loadProfiles, showAlert]);

  // Load introspection cache status for endpoint profiles
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const endpointProfiles = profiles.filter(p => p.sourceType === 'endpoint');
      const entries = await Promise.all(
        endpointProfiles.map(async profile => [profile.id, await getCache(profile.id)] as const)
      );
      if (!cancelled) setCaches(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, [profiles, getCache]);

  const handleAdd = () => {
    setEditingProfile(undefined);
    profileDialog.open();
  };

  const handleEdit = (profile: GraphQLSchemaProfile) => {
    setEditingProfile(profile);
    profileDialog.open();
  };

  const handleSave = async (input: GraphQLSchemaProfileInput) => {
    try {
      if (editingProfile) {
        await updateProfile(editingProfile.id, input);
        showAlert('Schema profile updated', 'success');
      } else {
        await createProfile(input);
        showAlert('Schema profile created', 'success');
      }
      profileDialog.close();
    } catch {
      showAlert('Failed to save schema profile', 'error');
    }
  };

  const handleDelete = (profile: GraphQLSchemaProfile) => {
    confirmDialog.open({
      title: 'Delete GraphQL Schema Profile',
      message: `Are you sure you want to delete "${profile.name}"? Requests using this schema will fall back to manual schema fetching.`,
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteProfile(profile.id);
          showAlert('Schema profile deleted', 'success');
        } catch {
          showAlert('Failed to delete schema profile', 'error');
        }
      },
    });
  };

  return (
    <div className="space-y-4 w-full">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">GraphQL Schemas</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Schema profiles provide IntelliSense and validation for GraphQL requests in this workspace.
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-10 text-gray-400 dark:text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      )}

      {!loading && profiles.length === 0 && (
        <EmptyState
          icon={<Database className="w-12 h-12" />}
          title="No schema profiles"
          description="Add a GraphQL schema endpoint or SDL to enable IntelliSense for this workspace"
          action={{ label: 'New Schema Profile', onClick: handleAdd, icon: <Plus className="w-4 h-4" /> }}
        />
      )}

      {!loading && profiles.length > 0 && (
        <div className="border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700/50">
          {profiles.map(profile => {
            const profileUrl = profile.sourceUrl ? profile.sourceUrl : '';
            const profileContent = profile.content ? `${profile.content.split('\n').length} lines` : '';
            const profileDisplay = profileUrl || profileContent;

            return (
              <div key={profile.id} className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {profile.name}
                    </span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                        SOURCE_TYPE_BADGE_STYLES[profile.sourceType]
                      }`}
                    >
                      {SOURCE_TYPE_LABELS[profile.sourceType]}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                    {profileDisplay}
                    {profile.sourceType === 'endpoint' && !!(caches[profile.id]?.fetchedAt) && (
                      <span className="ml-2">
                        schema cached {new Date(caches[profile.id]!.fetchedAt).toLocaleDateString()}
                      </span>
                    )}
                    <span className="ml-2">updated {new Date(profile.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="icon" size="sm" title="Edit profile" onClick={() => handleEdit(profile)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="icon" size="sm" title="Delete profile" onClick={() => handleDelete(profile)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {profiles.length > 0 && (
        <Button variant="secondary" size="sm" onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-1.5" />
          New Schema Profile
        </Button>
      )}

      <Dialog
        isOpen={profileDialog.isOpen}
        onClose={profileDialog.close}
        title={editingProfile ? 'Edit GraphQL Schema Profile' : 'New GraphQL Schema Profile'}
        size="lg"
      >
        <div className="p-6">
          <GraphQLSchemaProfileForm
            key={editingProfile?.id ?? 'new'}
            profile={editingProfile}
            defaultUrl=""
            onSave={handleSave}
            onCancel={profileDialog.close}
          />
        </div>
      </Dialog>

      <ConfirmDialog {...confirmDialog.props} />
    </div>
  );
}
