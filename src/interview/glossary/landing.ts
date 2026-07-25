/**
 * Where an agreed term lands. A term settled with the user belongs to the
 * PRODUCT, not to the agent's personal memory: memory follows the agent and is
 * invisible to everyone else, so a shared agreement parked there stops being
 * shared the moment a different session or person picks the work up.
 *
 * The path is a repo-relative product artifact, and the U8 directive quotes
 * this same constant so the instruction and the module cannot drift apart.
 */

export const GLOSSARY_LANDING_PATH = "docs/glossary.md";
