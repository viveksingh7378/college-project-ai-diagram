import plantumlEncoder from 'plantuml-encoder';

const PLANTUML_SERVER = process.env.PLANTUML_SERVER || 'https://www.plantuml.com/plantuml/png';

/**
 * Encodes PlantUML code and returns a render URL from the PlantUML server.
 * @param {string} pumlCode - Raw @startuml...@enduml code
 * @returns {string}        - Full image URL
 */
export const encodePuml = (pumlCode) => {
  const encoded = plantumlEncoder.encode(pumlCode);
  return `${PLANTUML_SERVER}/${encoded}`;
};
