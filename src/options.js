import * as countries from './countries.json'

const modesPopular = [
    'FT8',
    'FT4',
    'WSPR',
    'CW',
    'PSK31',
    'RTTY',
    'SSTV',
    'SSB',
    'FM'
  ]

  const otherModes = [
    'JS8',
    'VARAC',
    'MSK144',
    'OPERA',
    'FST4W',
    'JT65',
    'JT',
    'PSK',
    'JT65B',
    'PI4',
    'OLIVIA 8',
    'Q65',
    'OLIVIA 4',
    'Q65B',
    'PSK32',
    'JT9',
    'ROS',
    'THOR16',
    'CONTESTI',
    'THOR',
    'PSK63',
    'FREEDV',
    'OLIVIA 1',
    'FSK441',
    'THOR11',
    'THOR4',
    'HELL',
    'OLIVIA',
    'Q65A',
    'DOMINO',
    'T10',
    'OLIVIA 3',
    'FST4',
    'MFSK16',
    'JTMS',
    'SIM31',
    'MFSK32',
    'PSK125',
    'JT4',
    'ECHO',
    'RTTYM',
    'PSK250',
    'OLIVIA-1',
    'THOR22',
    'THOR8',
    'MFSK4',
    'MFSK128',
    'FSKH105',
    'OLIVIA-8',
    'MT63-2KL',
    'FREQCAL',
    'THRB',
    'OLIVIA-3',
    'PSK45',
    'RTTY-45',
    'THOR5',
    '-FT8'
  ]

  const bands = [
    'vlf',
    '4000m',
    '2200m',
    '600m',
    '160m',
    '80m',
    '60m',
    '40m',
    '30m',
    '20m',
    '17m',
    '15m',
    '12m',
    '11m',
    '10m',
    '8m',
    '6m',
    '5m',
    '4m',
    '2m',
    '1.25m',
    '70cm',
    '33cm',
    '23cm',
    '2.4Ghz',
    '3.4Ghz',
    '5.8Ghz',
    '10Ghz',
    '24Ghz',
    '47Ghz',
    '76Ghz'
  ]

  const bandOptions = [
    { value: '+', label: 'All bands' },
    ...bands.map(b => ({ value: b, label: b }))
  ]

  const modeOptions = [
    {
      label: 'Popular Modes',
      options: [
        { value: '+', label: 'All modes' },
        ...modesPopular.map(m => ({ value: m, label: m }))
      ]
    },
    {
      label: 'Other Modes',
      options: otherModes.map(m => ({ value: m, label: m }))
    }
  ]

  const countryOptions = [
    {
      value: '+',
      label: 'All countries'
    },
    ...Object.entries(countries).map(([code, name]) => ({
      value: code,
      label: name
    }))
  ]

  const ttlOptions = [
    { label: 'Forever', value: Infinity },
    { label: '1h', value: 3600 },
    { label: '30m', value: 1800 },
    { label: '5m', value: 300 },
    { label: '30s', value: 30 },
    { label: 'Instant', value: 3 }
  ]

  export { bandOptions, modeOptions, countryOptions, ttlOptions }
