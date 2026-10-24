export function calculateHourlyBookingPrice(hourlyRate: number, hours: number, calloutFee: number) {
  const serviceSubtotal = hourlyRate * hours;
  return {
    serviceSubtotal,
    calloutFee,
    total: serviceSubtotal + calloutFee,
  };
}
