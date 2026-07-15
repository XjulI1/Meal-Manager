## ADDED Requirements

### Requirement: Enrichissement à partir de valeurs fournies par une source externe

Le système SHALL permettre d'appliquer un enrichissement à un vin à partir de valeurs **déjà obtenues** (par exemple recherchées par un agent LLM via MCP), **sans appel à l'IA côté serveur**. Cette application SHALL suivre exactement les mêmes règles de persistance que l'enrichissement in-app : un champ omis laisse la valeur existante inchangée, une fenêtre de garde incohérente (`gardeMin > gardeMax`) est neutralisée (la fenêtre existante est conservée), et `aiEnrichedAt` est daté à l'instant courant. La logique de persistance SHALL être partagée entre le flux applicatif (recherche par l'API Anthropic) et le flux à valeurs fournies (une même fonction `applyWineEnrichment`), de sorte que les deux chemins produisent un résultat identique pour les mêmes valeurs.

#### Scenario: Application de valeurs fournies sans appel IA serveur
- **GIVEN** un vin d'un foyer et un jeu de valeurs d'enrichissement fourni (garde, arômes, accords)
- **WHEN** ces valeurs sont enregistrées via le chemin « valeurs fournies »
- **THEN** aucune requête à l'API Anthropic n'est effectuée côté serveur
- **AND** les champs fournis sont persistés et `aiEnrichedAt` est daté

#### Scenario: Règles de persistance identiques aux deux chemins
- **GIVEN** un même vin et un même résultat d'enrichissement (dont une fenêtre de garde incohérente et un champ omis)
- **WHEN** le résultat est appliqué par le flux applicatif d'une part et par le flux à valeurs fournies d'autre part
- **THEN** l'état persisté du vin est identique dans les deux cas (garde incohérente neutralisée, champ omis inchangé, `aiEnrichedAt` daté)
