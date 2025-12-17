// FHIR n8n Custom Nodes - Entry Point
// Simple index for all FHIR transformation nodes

module.exports = {
  patient: require('./patient.js'),
  // Additional nodes to be added:
  // appointment: require('./appointment.js'),
  // bundle: require('./bundle.js'),
  // claimResponse: require('./claimResponse.js'),
  // eligibilityResponse: require('./eligibilityResponse.js')
};