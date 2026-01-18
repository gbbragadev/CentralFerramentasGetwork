import { compileExpression } from 'filtrex';

export type FilterResult = {
  matches: boolean;
  error?: string;
};

export function buildFilterEvaluator(expression?: string | null) {
  if (!expression) {
    return null;
  }

  try {
    const evaluator = compileExpression(expression);
    return (context: Record<string, unknown>): FilterResult => {
      try {
        return { matches: Boolean(evaluator(context)) };
      } catch (error: any) {
        return { matches: false, error: error?.message || 'Erro ao avaliar filtro' };
      }
    };
  } catch (error: any) {
    return () => ({
      matches: false,
      error: error?.message || 'Expressao invalida',
    });
  }
}
