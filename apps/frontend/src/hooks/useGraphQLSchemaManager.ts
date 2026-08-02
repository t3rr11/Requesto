import { useCallback, useEffect, useRef, useState } from 'react';
import type { UseFormGetValues, UseFormSetValue } from 'react-hook-form';
import type { GraphQLSchema } from 'graphql';
import type { RequestFormData } from '../forms/schemas/requestFormSchema';
import { buildSchemaFromProfile, serializeSchemaIntrospection } from '../helpers/graphqlSchema';
import type { Tab } from '../store/tabs/types';
import { useGraphQLSchemaStore } from '../store/graphql/store';
import type { GraphQLSchemaProfile, GraphQLSchemaProfileInput } from '../store/graphql/types';
import { useConfirmDialog, useDialog } from './useDialog';

interface UseGraphQLSchemaManagerOptions {
  currentTab: Tab | null;
  requestType: 'http' | 'graphql';
  url: string;
  profileId: string;
  getValues: UseFormGetValues<RequestFormData>;
  setValue: UseFormSetValue<RequestFormData>;
  onFetchSchema?: (formData: RequestFormData) => Promise<GraphQLSchema>;
}

export function useGraphQLSchemaManager({
  currentTab,
  requestType,
  url,
  profileId,
  getValues,
  setValue,
  onFetchSchema,
}: UseGraphQLSchemaManagerOptions) {
  const [schema, setSchema] = useState<GraphQLSchema | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState<GraphQLSchemaProfile | undefined>();
  const fetchKeyRef = useRef<string | null>(null);
  const schemaDialog = useDialog();
  const profileDialog = useDialog();
  const deleteProfileDialog = useConfirmDialog();
  const {
    profiles,
    loading: profilesLoading,
    loaded: profilesLoaded,
    loadProfiles,
    createProfile,
    updateProfile,
    deleteProfile,
    getCache,
    saveCache,
  } = useGraphQLSchemaStore();

  useEffect(() => {
    fetchKeyRef.current = null;
    setSchema(null);
    setLoading(false);
    setError(null);
  }, [currentTab?.id]);

  const fetchSchema = useCallback(async (
    formData: RequestFormData,
    fetchKey: string,
    showErrorDialog: boolean,
    cacheProfile?: GraphQLSchemaProfile,
  ) => {
    if (!onFetchSchema) return;
    fetchKeyRef.current = fetchKey;
    setLoading(true);
    setError(null);
    try {
      const nextSchema = await onFetchSchema(formData);
      if (fetchKeyRef.current !== fetchKey) return;
      setSchema(nextSchema);
      if (cacheProfile?.sourceType === 'endpoint' && cacheProfile.sourceUrl) {
        await saveCache(
          cacheProfile.id,
          cacheProfile.sourceUrl,
          serializeSchemaIntrospection(nextSchema),
        ).catch(() => undefined);
      }
    } catch (fetchError) {
      if (fetchKeyRef.current !== fetchKey) return;
      setError(fetchError instanceof Error ? fetchError.message : String(fetchError));
      if (showErrorDialog) schemaDialog.open();
    } finally {
      if (fetchKeyRef.current === fetchKey) setLoading(false);
    }
  }, [onFetchSchema, saveCache, schemaDialog.open]);

  const loadProfile = useCallback(async (profile: GraphQLSchemaProfile, showErrorDialog: boolean) => {
    const fetchKey = `${currentTab?.id ?? 'draft'}:profile:${profile.id}`;
    fetchKeyRef.current = fetchKey;
    setLoading(profile.sourceType === 'endpoint');
    setError(null);
    try {
      if (profile.sourceType === 'endpoint') {
        const cache = await getCache(profile.id);
        if (fetchKeyRef.current !== fetchKey) return;
        const cachedSchema = buildSchemaFromProfile(profile, cache);
        if (cachedSchema) setSchema(cachedSchema);
        if (!onFetchSchema) {
          setLoading(false);
          return;
        }
        await fetchSchema({
          ...getValues(),
          url: profile.sourceUrl ?? getValues().url,
          params: [],
        }, fetchKey, showErrorDialog, profile);
      } else {
        setSchema(buildSchemaFromProfile(profile));
        setLoading(false);
      }
    } catch (loadError) {
      if (fetchKeyRef.current !== fetchKey) return;
      setLoading(false);
      setError(loadError instanceof Error ? loadError.message : String(loadError));
      if (showErrorDialog) schemaDialog.open();
    }
  }, [currentTab?.id, fetchSchema, getCache, getValues, schemaDialog.open]);

  const handleFetch = useCallback(() => {
    const profile = profiles.find(item => item.id === profileId);
    if (profile) {
      loadProfile(profile, true).catch(() => undefined);
      return;
    }
    const fetchKey = `${currentTab?.id ?? 'draft'}:${url}`;
    fetchSchema(getValues(), fetchKey, true).catch(() => undefined);
  }, [currentTab?.id, fetchSchema, getValues, loadProfile, profileId, profiles, url]);

  const handleProfileChange = useCallback(async (nextProfileId: string) => {
    setValue('graphqlSchemaProfileId', nextProfileId, { shouldDirty: true });
    if (!nextProfileId) {
      fetchKeyRef.current = null;
      setSchema(null);
      setLoading(false);
      setError(null);
      return;
    }
    const profile = profiles.find(item => item.id === nextProfileId);
    if (profile) await loadProfile(profile, true);
  }, [loadProfile, profiles, setValue]);

  const handleSaveProfile = useCallback(async (input: GraphQLSchemaProfileInput) => {
    const profile = editingProfile
      ? await updateProfile(editingProfile.id, input)
      : await createProfile(input);
    setEditingProfile(undefined);
    profileDialog.close();
    await handleProfileChange(profile.id);
  }, [createProfile, editingProfile, handleProfileChange, profileDialog.close, updateProfile]);

  const handleDeleteProfile = useCallback(() => {
    const profile = profiles.find(item => item.id === profileId);
    if (!profile) return;
    deleteProfileDialog.open({
      title: 'Delete GraphQL Schema Profile',
      message: `Delete "${profile.name}"? Requests linked to it will fall back to their own endpoint.`,
      confirmText: 'Delete profile',
      variant: 'danger',
      onConfirm: async () => {
        await deleteProfile(profile.id);
        await handleProfileChange('');
      },
    });
  }, [deleteProfile, deleteProfileDialog.open, handleProfileChange, profileId, profiles]);

  useEffect(() => {
    if (requestType === 'graphql' && !profilesLoaded && !profilesLoading) {
      loadProfiles().catch(() => undefined);
    }
  }, [loadProfiles, profilesLoaded, profilesLoading, requestType]);

  useEffect(() => {
    if (
      !currentTab?.savedRequestId ||
      currentTab.request.requestType !== 'graphql' ||
      !currentTab.request.url.trim() ||
      !onFetchSchema
    ) return;

    const linkedProfileId = currentTab.request.graphql?.schemaProfileId;
    const linkedProfile = linkedProfileId
      ? profiles.find(item => item.id === linkedProfileId)
      : undefined;
    if (linkedProfileId && !linkedProfile) {
      if (!profilesLoaded) return;
      setValue('graphqlSchemaProfileId', '', { shouldDirty: true });
    }
    if (linkedProfile) {
      const key = `${currentTab.id}:profile:${linkedProfile.id}`;
      if (fetchKeyRef.current !== key) loadProfile(linkedProfile, false).catch(() => undefined);
      return;
    }

    const key = `${currentTab.id}:${currentTab.request.url}`;
    if (fetchKeyRef.current !== key) fetchSchema(getValues(), key, false).catch(() => undefined);
  }, [currentTab?.id, currentTab?.savedRequestId, fetchSchema, getValues, loadProfile, onFetchSchema, profiles, profilesLoaded, setValue]);

  return {
    schema,
    loading,
    error,
    profiles,
    profilesLoading,
    editingProfile,
    setEditingProfile,
    schemaDialog,
    profileDialog,
    deleteProfileDialog,
    handleFetch,
    handleProfileChange,
    handleSaveProfile,
    handleDeleteProfile,
  };
}
