import {
  Activity,
  BadgeCheck,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  FileText,
  FlaskConical,
  Lightbulb,
  MapPin,
  Network,
  Package,
  Rows3,
  ShieldAlert,
  Users,
  Waypoints,
} from 'lucide-react';

export const EXTRACTION_CATEGORIES = [
  { id: 'keyPoints', label: 'Key Points', description: 'Major document-grounded findings', icon: Lightbulb, aliases: ['key_points', 'keypoints'] },
  { id: 'people', label: 'People', description: 'Named people and stated roles', icon: Users },
  { id: 'organizations', label: 'Organizations', description: 'Companies, institutions, and departments', icon: Network },
  { id: 'dates', label: 'Dates', description: 'Dates, periods, and durations', icon: CalendarDays },
  { id: 'locations', label: 'Locations', description: 'Explicit geographic locations', icon: MapPin },
  { id: 'technologies', label: 'Technologies', description: 'Named platforms, tools, and frameworks', icon: Waypoints },
  { id: 'algorithms', label: 'Algorithms', description: 'Models and algorithms', icon: FlaskConical },
  { id: 'datasets', label: 'Datasets', description: 'Datasets, sources, and features', icon: Rows3 },
  { id: 'products', label: 'Products', description: 'Named products and services', icon: Package },
  { id: 'requirements', label: 'Requirements', description: 'Functional and non-functional requirements', icon: ClipboardList },
  { id: 'risks', label: 'Risks', description: 'Explicit risks, limitations, and mitigations', icon: ShieldAlert },
  { id: 'recommendations', label: 'Recommendations', description: 'Stated recommendations', icon: BadgeCheck },
  { id: 'decisions', label: 'Decisions', description: 'Recorded decisions', icon: CheckSquare },
  { id: 'numericalValues', label: 'Numerical Values', description: 'Numbers, units, and context', icon: Activity, aliases: ['numerical_values', 'numbers'] },
  { id: 'metrics', label: 'Metrics', description: 'Evaluation and performance metrics', icon: Activity },
  { id: 'deadlines', label: 'Deadlines', description: 'Due dates and commitments', icon: CalendarDays },
  { id: 'tables', label: 'Tables', description: 'Structured tables already found in the document', icon: Rows3 },
  { id: 'references', label: 'References', description: 'Bibliography and cited references', icon: FileText },
  { id: 'actionItems', label: 'Action Items', description: 'Planned or assigned actions', icon: CheckSquare, aliases: ['action_items'] },
];

export const DEFAULT_EXTRACTION_TYPES = ['keyPoints'];

export const getCategoryDefinition = (categoryId) =>
  EXTRACTION_CATEGORIES.find((category) => category.id === categoryId) || {
    id: categoryId,
    label: String(categoryId || 'Custom Field')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (value) => value.toUpperCase()),
    description: 'Custom extraction field',
    icon: FileText,
    aliases: [],
  };

export const getCategoryValue = (result, category) => {
  if (!result || typeof result !== 'object') return undefined;

  const possibleKeys = [category.id, ...(category.aliases || [])];
  for (const key of possibleKeys) {
    if (Object.prototype.hasOwnProperty.call(result, key)) return result[key];
  }

  return undefined;
};

export const toExtractionItems = (value) => {
  if (value === undefined || value === null || value === '') return [];
  if (Array.isArray(value)) return value;

  if (typeof value === 'object') {
    return Object.entries(value).flatMap(([fieldName, fieldValue]) => {
      if (fieldValue === undefined || fieldValue === null || fieldValue === '') return [];
      if (Array.isArray(fieldValue)) {
        return fieldValue.map((item) =>
          typeof item === 'object' && item !== null
            ? { fieldName, ...item }
            : { fieldName, value: item }
        );
      }
      return typeof fieldValue === 'object'
        ? [{ fieldName, ...fieldValue }]
        : [{ fieldName, value: fieldValue }];
    });
  }

  return [{ value }];
};

export const getExtractionResult = (extraction) => {
  const rawResult = extraction?.result || extraction?.results || extraction?.data?.result || {};
  return rawResult?.categories || rawResult;
};
