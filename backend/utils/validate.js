// Shared validation and parsing utilities for Vivas AI
export function validate(schema, data) {
  const errors = {};
  for (const [field, rules] of Object.entries(schema)) {
    const val = data ? data[field] : undefined;

    if (rules.required) {
      if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
        errors[field] = rules.message || `${field} is required`;
        continue;
      }
    }

    if (val !== undefined && val !== null && val !== '') {
      if (rules.type === 'number') {
        const num = Number(val);
        if (isNaN(num)) {
          errors[field] = `${field} must be a valid number`;
        } else {
          if (rules.min !== undefined && num < rules.min) {
            errors[field] = `${field} must be at least ${rules.min}`;
          }
          if (rules.max !== undefined && num > rules.max) {
            errors[field] = `${field} must not exceed ${rules.max}`;
          }
        }
      }

      if (rules.type === 'string' || rules.pattern) {
        if (typeof val !== 'string') {
          errors[field] = `${field} must be text`;
        } else {
          if (rules.minLength && val.trim().length < rules.minLength) {
            errors[field] = `${field} must be at least ${rules.minLength} characters`;
          }
          if (rules.maxLength && val.trim().length > rules.maxLength) {
            errors[field] = `${field} must not exceed ${rules.maxLength} characters`;
          }
          if (rules.pattern && !rules.pattern.test(val)) {
            errors[field] = rules.patternMessage || `${field} format is invalid`;
          }
        }
      }

      if (rules.enum && Array.isArray(rules.enum)) {
        if (!rules.enum.includes(val)) {
          errors[field] = `${field} must be one of: ${rules.enum.join(', ')}`;
        }
      }

      if (rules.custom && typeof rules.custom === 'function') {
        const customErr = rules.custom(val, data);
        if (customErr) errors[field] = customErr;
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

export function validateBody(schema) {
  return (req, res, next) => {
    const { valid, errors } = validate(schema, req.body);
    if (!valid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    next();
  };
}
