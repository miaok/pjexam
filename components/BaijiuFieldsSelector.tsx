import React from 'react';

import { BaijiuFieldsSelectorProps } from '@/utils/types';

const BaijiuFieldsSelector: React.FC<BaijiuFieldsSelectorProps> = ({ baijiuFields, onFieldChange }) => (
  <div className="settings-checkbox-container" style={{justifyContent: 'center', marginBottom: '1rem'}}>
    {Object.entries(baijiuFields).map(([field, checked]) => (
      <div className="setting-item-checkbox" key={field}>
        <input
          type="checkbox"
          id={`baijiu-field-${field}`}
          checked={checked}
          onChange={e => onFieldChange(field, e.target.checked)}
        />
        <label htmlFor={`baijiu-field-${field}`}>{field}</label>
      </div>
    ))}
  </div>
);

export default BaijiuFieldsSelector; 