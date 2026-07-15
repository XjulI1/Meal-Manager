/**
 * Core research brief for wine enrichment, shared between the in-app AI adapter
 * (which appends the tool-calling instruction for the Anthropic API) and the
 * MCP `save_wine_enrichment` tool description (which lets Claude Desktop do the
 * research). Keeping the substance here guarantees both paths ask for the same
 * thing; only the tool-calling sentence differs by context.
 */
export const WINE_ENRICHMENT_BRIEF
  = 'Tu es sommelier. À partir de ce que l\'on sait d\'un vin, recherche des '
    + 'informations fiables sur cette cuvée : la fenêtre de garde (années '
    + 'd\'apogée), son profil aromatique et les accords mets/vin. N\'invente rien : '
    + 'si une information reste incertaine, ne renseigne pas le champ correspondant.'
