import { checkConditionGeneric as _checkConditionGeneric } from "@unsonet/utils";

export function filterArray(arr, removeArr) {
  return arr.filter(item => !removeArr.includes(item))
}

export function checkConditionGeneric(options: {
  value: string | string[];
  operator: string;
  comparisonValue?: string | string[];
  valuesType?: 'string' | 'number' | 'date' | 'array' | 'object';
  treatAsCollection?: boolean;
  customOperators?: Record<string, any>;
}) {
  let {value,
  operator,
  comparisonValue,
  valuesType,
  treatAsCollection,
  customOperators} = options || {};

  let _customOperators = {
    inList: {
      needsComparisonValue: true,
      outer: 'every',   
      inner: 'some',    
      compareFn: (v, c) => {
        const sv = v == null ? '' : String(v);
        const sc = c == null ? '' : String(c);
        return sv === sc; 
      },
    },
    notInList: {
      needsComparisonValue: true,
      outer: 'every', 
      inner: 'every',
      compareFn: (v, c) => {
        const sv = v == null ? '' : String(v);
        const sc = c == null ? '' : String(c);
        return sv !== sc;
      },
    },
  };
  customOperators = Object.assign(_customOperators, customOperators);

  let res;

  let getArrayValues = (value)=>{
    return value.split(/[,;]/gim).map(item => item.trim());
  };

  let normalizeValue =  (value)=>{
    return typeof value == 'string' ? getArrayValues(value) : value;
  };

  switch (options.operator) {
    case 'inList': {
      res = _checkConditionGeneric({
        value: normalizeValue(value),
        operator: 'inList',
        comparisonValue: normalizeValue(comparisonValue),
        valuesType: 'string',
        customOperators
      });
      break;
    }
    case 'notInList': {
      res = _checkConditionGeneric({
        value: normalizeValue(value),
        operator: 'notInList',
        comparisonValue: normalizeValue(comparisonValue),
        valuesType: 'string',
        customOperators
      });
      break;
    }
    default: {
      res = _checkConditionGeneric(options);
      break;
    }
  }

  return res;
}

