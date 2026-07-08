import locations from '../data/vietnamLocations.json';

export function getProvinces() {
  return locations;
}

export function getDistricts(provinceId) {
  const province = locations.find((p) => p.id === provinceId);
  return province?.districts ?? [];
}

export function composeAddress({ street, provinceId, districtId }) {
  const province = locations.find((p) => p.id === provinceId);
  const district = province?.districts?.find((d) => d.id === districtId);
  const parts = [street?.trim(), district?.name, province?.name].filter(Boolean);
  return parts.join(', ');
}

/** Best-effort parse when editing legacy flat address strings. */
export function parseAddress(value) {
  if (!value) {
    return { street: '', provinceId: '', districtId: '' };
  }
  for (const province of locations) {
    if (!value.includes(province.name)) continue;
    for (const district of province.districts) {
      if (value.includes(district.name)) {
        const street = value
          .replace(district.name, '')
          .replace(province.name, '')
          .replace(/,\s*/g, ' ')
          .trim()
          .replace(/^,\s*|,\s*$/g, '');
        return { street, provinceId: province.id, districtId: district.id };
      }
    }
    return {
      street: value.replace(province.name, '').replace(/,\s*/g, ' ').trim(),
      provinceId: province.id,
      districtId: '',
    };
  }
  return { street: value, provinceId: '', districtId: '' };
}
