/**
 * Configuration helpers for client & server components.
 */

/**
 * Determines whether simulation controls ("Simulate Drop") should be displayed.
 * In production, it is strictly hidden unless NEXT_PUBLIC_ENABLE_SIMULATION is set to 'true'.
 * In local development, enabled by default for developer convenience.
 */
export function isSimulationEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_ENABLE_SIMULATION === 'true') {
    return true;
  }
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  return true;
}
