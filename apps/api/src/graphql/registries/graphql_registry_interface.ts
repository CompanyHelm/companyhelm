/**
 * Describes the plain resolver object fragment owned by a domain-specific registry.
 */
export type GraphqlResolverFragment = Record<string, Record<string, unknown>>;

/**
 * Defines the contract shared by the domain registries that contribute GraphQL resolver maps.
 */
export interface GraphqlRegistryInterface {
  /**
   * Returns the resolver fragment for the slice of the schema owned by this registry.
   * The fragment is merged with other registries by the top-level resolver registry.
   */
  createResolvers(): GraphqlResolverFragment;
}
