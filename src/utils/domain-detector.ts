import businessDomains from '../data/business-domains.json';

export interface DomainMatch {
  domain: string;
  confidence: number;
  entities: string[];
  tableStructure: any;
  name: string;
  description: string;
  icon: string;
}

export interface PatternMatch {
  domain: string;
  requiredMatches: number;
  optionalMatches: number;
  totalScore: number;
}

/**
 * Detecta el dominio de negocio basado en los headers de la tabla
 */
export function detectBusinessDomain(headers: string[]): DomainMatch | null {
  const lowerHeaders = headers.map(h => h.toLowerCase());
  const patternMatches: PatternMatch[] = [];

  // Analizar cada dominio
  for (const [domainKey, domain] of Object.entries(businessDomains.domains)) {
    const patterns = domain.patterns;
    
    // Contar coincidencias requeridas
    const requiredMatches = patterns.required.filter(pattern => 
      lowerHeaders.some(header => header.includes(pattern))
    ).length;
    
    // Contar coincidencias opcionales
    const optionalMatches = patterns.optional.filter(pattern => 
      lowerHeaders.some(header => header.includes(pattern))
    ).length;
    
    // Calcular score total
    const totalScore = (requiredMatches * 2) + (optionalMatches * 0.5);
    
    patternMatches.push({
      domain: domainKey,
      requiredMatches,
      optionalMatches,
      totalScore
    });
  }

  // Ordenar por score y encontrar el mejor match
  patternMatches.sort((a, b) => b.totalScore - a.totalScore);
  
  // Si no hay coincidencias, usar fallback
  if (patternMatches.length === 0 || patternMatches[0].totalScore === 0) {
    return {
      domain: 'fallback',
      confidence: 0,
      entities: businessDomains.fallback.entities,
      tableStructure: businessDomains.fallback.tableStructure,
      name: businessDomains.fallback.name,
      description: businessDomains.fallback.description,
      icon: businessDomains.fallback.icon
    };
  }

  const bestMatch = patternMatches[0];
  const domain = businessDomains.domains[bestMatch.domain as keyof typeof businessDomains.domains];
  
  // Calcular confianza basada en el score
  const maxPossibleScore = (domain.patterns.required.length * 2) + (domain.patterns.optional.length * 0.5);
  const confidence = Math.min((bestMatch.totalScore / maxPossibleScore) * 100, 100);

  return {
    domain: bestMatch.domain,
    confidence: Math.round(confidence),
    entities: domain.entities,
    tableStructure: domain.tableStructure,
    name: domain.name,
    description: domain.description,
    icon: domain.icon
  };
}

