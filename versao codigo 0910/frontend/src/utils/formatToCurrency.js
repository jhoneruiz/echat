/* eslint-disable new-cap */
export default function formatToCurrency(value) {
  return Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(value);
}
