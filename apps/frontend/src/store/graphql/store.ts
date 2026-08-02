import { create } from 'zustand';
import * as actions from './actions';
import type { GraphQLSchemaCacheEntry, GraphQLSchemaProfile, GraphQLSchemaProfileInput } from './types';

type GraphQLSchemaState = {
  profiles: GraphQLSchemaProfile[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
  loadProfiles: () => Promise<void>;
  createProfile: (input: GraphQLSchemaProfileInput) => Promise<GraphQLSchemaProfile>;
  updateProfile: (id: string, input: GraphQLSchemaProfileInput) => Promise<GraphQLSchemaProfile>;
  deleteProfile: (id: string) => Promise<void>;
  getCache: (id: string) => Promise<GraphQLSchemaCacheEntry | null>;
  saveCache: (id: string, sourceUrl: string, introspection: unknown) => Promise<GraphQLSchemaCacheEntry>;
};

export const useGraphQLSchemaStore = create<GraphQLSchemaState>((set, get) => ({
  profiles: [],
  loading: false,
  loaded: false,
  error: null,

  loadProfiles: async () => {
    set({ loading: true, error: null });
    try {
      set({ profiles: await actions.getGraphQLSchemaProfiles(), loaded: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  createProfile: async input => {
    const profile = await actions.createGraphQLSchemaProfile(input);
    set({ profiles: [...get().profiles, profile] });
    return profile;
  },

  updateProfile: async (id, input) => {
    const profile = await actions.updateGraphQLSchemaProfile(id, input);
    set({ profiles: get().profiles.map(existing => existing.id === id ? profile : existing) });
    return profile;
  },

  deleteProfile: async id => {
    await actions.deleteGraphQLSchemaProfile(id);
    set({ profiles: get().profiles.filter(profile => profile.id !== id) });
  },

  getCache: actions.getGraphQLSchemaCache,
  saveCache: actions.saveGraphQLSchemaCache,
}));
