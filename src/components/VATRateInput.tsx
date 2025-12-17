import React, { useState } from 'react';

interface VATRateInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
}

const VATRateInput: React.FC<VATRateInputProps> = ({ value, onChange, label = 'VAT Rate %', required = false }) => {
  const [isCustom, setIsCustom] = useState(() => {
    const numValue = parseFloat(value);
    return !isNaN(numValue) && numValue !== 0 && numValue !== 16;
  });

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    if (selectedValue === 'custom') {
      setIsCustom(true);
      onChange('');
    } else {
      setIsCustom(false);
      onChange(selectedValue);
    }
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {!isCustom ? (
        <select
          value={value}
          onChange={handleSelectChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          required={required}
        >
          <option value="0">0%</option>
          <option value="16">16%</option>
          <option value="custom">Custom...</option>
        </select>
      ) : (
        <div className="flex gap-2">
          <input
            type="number"
            step="0.01"
            value={value}
            onChange={handleCustomChange}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Enter custom rate"
            required={required}
          />
          <button
            type="button"
            onClick={() => {
              setIsCustom(false);
              onChange('0');
            }}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
          >
            Preset
          </button>
        </div>
      )}
    </div>
  );
};

export default VATRateInput;
