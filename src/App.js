/// app.js
import 'antd/dist/reset.css'
import 'mapbox-gl/dist/mapbox-gl.css'

import { useEffect, useState, useRef } from 'react'
import DeckGL from '@deck.gl/react'
import { Map } from 'react-map-gl'
import {
  GreatCircleLayer,
  ScatterplotLayer,
  MapView,
  GeoJsonLayer
} from 'deck.gl'
//import { DataFilterExtension } from '@deck.gl/extensions'
import { locatorToLatLng } from 'qth-locator'
import { useSpring, animated } from '@react-spring/web'
import {
  Card,
  Space,
  Statistic,
  Input,
  Button,
  Select,
  Checkbox,
  Radio,
  Drawer
} from 'antd'
import {
  SyncOutlined,
  CheckCircleTwoTone,
  UserOutlined,
  TableOutlined
} from '@ant-design/icons'
import * as GeoJSONTerminator from '@webgeodatavore/geojson.terminator'

import { bandOptions, modeOptions, countryOptions, ttlOptions } from './options'
import './App.css'
import { formatDistance, formatRFC7231 } from 'date-fns'

const WS_FEED_BASE_PATH = 'wss://mqtt.pskreporter.info:1886'

const MAPBOX_ACCESS_TOKEN =
  'pk.eyJ1IjoibWlscXVldG9hc3QiLCJhIjoiY2xjaDM0bG43OGV1MzN2cGxxYjlzajZkZiJ9.biDyx4pCkGlU_3PThTI-6A'

const INITIAL_VIEW_STATE = {
  longitude: 174.7455760648327,
  latitude: -36.8632553393452,
  zoom: 2
  //pitch: 40.5,
  //bearing: -27
}

function useInterval (callback, delay) {
  const intervalRef = useRef(null)
  const savedCallback = useRef(callback)
  useEffect(() => {
    savedCallback.current = callback
  }, [callback])
  useEffect(() => {
    const tick = () => savedCallback.current()
    if (typeof delay === 'number') {
      intervalRef.current = window.setInterval(tick, delay)
      return () => window.clearInterval(intervalRef.current)
    }
  }, [delay])
  return intervalRef
}

function App (props) {
  const [liveData, setLiveData] = useState([])
  const [dataCount, setDataCount] = useState({ prev: 0, next: 0 })
  const [filters, setFilters] = useState({
    sender: { callsign: null, locator: 'RF73', country: null },
    receiver: { callsign: null, locator: null, country: null },
    viceVersa: true
  })
  const [currentMode, setCurrentMode] = useState('+')
  const [currentBand, setCurrentBand] = useState('+')
  const [ttl, setTtl] = useState(Infinity)
  const [showTransmitterBubbles, setShowTransmitterBubbles] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(true)
  const [loading, setLoading] = useState(true)
  const [terminator, setTerminator] = useState(new GeoJSONTerminator())

  const [deckViewState, setDeckViewState] = useState(INITIAL_VIEW_STATE)

  useEffect(() => {
    if (ttl === 3) {
      setShowTransmitterBubbles(true)
    }
  }, [ttl])

  /* update the terminator every 10 minutes */
  useInterval(() => {
    setTerminator(new GeoJSONTerminator())
  }, 1000 * 60 * 10)

  const [senderMaidenhead, setSenderMaidenhead] = useState(null)
  const [receiverMaidenhead, setReceiverMaidenhead] = useState(null)

  useEffect(() => {
    if (filters.sender.locator) {
      const locator = filters.sender.locator.substr(0, 4)
      const level = locator.length === 2 ? 1 : 2
      fetch(`/maidenhead_level${level}/grid/${locator}.json`)
        .then(response => response.json())
        .then(data => {
          setSenderMaidenhead(data)
        })
      if (level > 1)
        setDeckViewState(s => {
          const [latitude, longitude] = locatorToLatLng(filters.sender.locator)
          return { ...s, latitude, longitude, zoom: s.zoom < 5 ? 5 : s.zoom }
        })
    }
  }, [filters])

  useEffect(() => {
    if (filters.receiver.locator) {
      const locator = filters.receiver.locator.substr(0, 4)
      const level = locator.length === 2 ? 1 : 2
      fetch(`/maidenhead_level${level}/grid/${locator}.json`)
        .then(response => response.json())
        .then(data => {
          setReceiverMaidenhead(data)
        })
      if (level > 1)
        setDeckViewState(s => {
          const [latitude, longitude] = locatorToLatLng(
            filters.receiver.locator
          )
          return { ...s, latitude, longitude, zoom: s.zoom < 5 ? 5 : s.zoom }
        })
    }
  }, [filters])

  const layers = [
    new GeoJsonLayer({
      id: 'terminator-layer',
      data: terminator,
      filled: true,
      getFillColor: [0, 0, 0, 30]
    }),
    new GeoJsonLayer({
      id: 'sender-maidenhead-layer',
      data: senderMaidenhead,
      filled: false,
      stroked: true,
      lineWidthScale: 2,
      lineWidthMinPixels: 2,
      getLineColor: () =>
        filters.viceVersa ? [255, 255, 255, 255] : [255, 0, 0, 255],
      getLineWidth: 2,
      visible: filters.sender.locator
    }),
    new GeoJsonLayer({
      id: 'receiver-maidenhead-layer',
      data: receiverMaidenhead,
      filled: false,
      stroked: true,
      lineWidthScale: 2,
      lineWidthMinPixels: 2,
      getLineColor: () =>
        filters.viceVersa ? [255, 255, 255, 255] : [0, 255, 0, 255],
      getLineWidth: 2,
      visible: filters.receiver.locator
    }),
    new GreatCircleLayer({
      id: 'arc-layer',
      data: liveData,
      wrapLongitude: true,
      pickable: true,
      getSourcePosition: d => d.from.coords,
      getTargetPosition: d => d.to.coords,
      getSourceColor: ({ hide }) => [255, 0, 0, hide ? 0 : 80],
      getTargetColor: ({ hide }) => [0, 255, 0, hide ? 0 : 60],
      getStrokeWidth: d => 1,
      transitions: {
        getSourceColor: {
          duration: 500,
          enter: value => [value[0], value[1], value[2], 0]
        },
        getTargetColor: {
          duration: 1000,
          enter: value => [value[0], value[1], value[2], 0]
        }
      }
    }),
    new ScatterplotLayer({
      id: 'transmitter-bubbles-layer',
      data: liveData,
      pickable: false,
      opacity: 0.8,
      filled: true,
      radiusUnits: 'pixels',
      getPosition: d => d.from.coords,
      getRadius: ({ hide, report }) => (hide ? 0 : report + 30),
      getFillColor: d => [255, 255, 255, 40],
      getLineColor: d => [0, 0, 0],
      transitions: {
        getRadius: {
          duration: 1000,
          enter: value => 0
        }
      },
      visible: showTransmitterBubbles
    })
  ]

  useEffect(() => {
    const { sender, receiver, viceVersa } = filters
    if (
      !(
        sender.callsign ||
        sender.locator ||
        receiver.callsign ||
        receiver.locator
      )
    ) {
      return
    }

    const senderCall = sender.callsign || '+'
    const receiverCall = receiver.callsign || '+'
    const senderLocator = sender.locator || '+'
    const receiverLocator = receiver.locator || '+'
    const senderCountry = sender.country || '+'
    const receiverCountry = receiver.country || '+'

    const WS_FEED_TOPIC =
      `pskr/filter/v2/${currentBand}/${currentMode}/${senderCall}/${receiverCall}` +
      `/${senderLocator}/${receiverLocator}/${senderCountry}/${receiverCountry}`

    const WS_FEED_TOPIC_VICE_VERSA =
      `pskr/filter/v2/${currentBand}/${currentMode}/${receiverCall}/${senderCall}` +
      `/${receiverLocator}/${senderLocator}/${receiverCountry}/${senderCountry}`

    const client = window.mqtt.connect(`${WS_FEED_BASE_PATH}`)

    client.on('connect', function () {
      client.subscribe(WS_FEED_TOPIC, function (err) {
        console.error(err)
        if (!err) {
          setLoading(false)
          console.log(WS_FEED_TOPIC)
        }
      })
      if (viceVersa) {
        client.subscribe(WS_FEED_TOPIC_VICE_VERSA, function (err) {
          console.error(err)
          if (!err) {
            console.log(WS_FEED_TOPIC_VICE_VERSA)
          }
        })
      }
    })

    client.on('message', (topic, message) => {
      const parsed = JSON.parse(message.toString())
      const { rl, sl, sc, rc, sa, ra, rp, f, md, b, t } = parsed
      // {"sq":32927159252,"f":14076587,"md":"FT8","rp":-3,"t":1672811924,"sc":"HL3BAT","sl":"PM36QI","rc":"JJ1QWP","rl":"PM95tr","sa":137,"ra":339,"b":"20m"}
      const [rLat, rLong] = locatorToLatLng(rl)
      const [sLat, sLong] = locatorToLatLng(sl)
      setLiveData(data => [
        ...data,
        {
          from: { coords: [sLong, sLat], callsign: sc, country: sa },
          to: { coords: [rLong, rLat], callsign: rc, country: ra },
          timestamp: new Date(),
          t,
          report: rp,
          frequency: f,
          mode: md,
          band: b
        }
      ])
    })

    return () => {
      client.end()
    }
  }, [filters, currentBand, currentMode])

  useEffect(() => {
    /* Clear existing live data when the band or mode changes */
    setLiveData([])
  }, [currentMode, currentBand, filters, ttl])

  const [spotsPerSec, setSpotsPerSec] = useState({ prev: 0, next: 0 })

  useInterval(() => {
    /* Calculate a rolling average of spots per second 
    const windowSize = 1000
    const slice = liveData.slice(-windowSize)
    const first = slice[0] || { timestamp: new Date() }
    const last = slice[slice.length - 1] || { timestamp: new Date() }
    const currentAvgRate =
      (slice.length * 60 * 60) / (last.timestamp - first.timestamp)

    setSpotsPerSec(({ next }) => ({ prev: next, next: currentAvgRate }))
    */
    setDataCount(({ next }) => ({
      prev: next,
      next: liveData.length
    }))
  }, 1000)

  useInterval(() => {
    if (ttl === Infinity) return
    const now = new Date()
    setLiveData(data =>
      data
        .map(d =>
          now - d.timestamp >= ttl * 1000 ? { ...d, hide: new Date() } : d
        ) /* allow time for the fade out animation to finish before removing spot */
        .filter(({ hide }) => hide === undefined || now - hide < 2000)
    )
  }, 1000)

  const interpolator = useSpring({
    spotsPerSec: spotsPerSec.next,
    dataCount: dataCount.next,
    from: { spotsPerSec: spotsPerSec.prev, dataCount: dataCount.prev }
  })

  const tabListBase = [
    {
      key: 'callsign',
      tab: 'Callsign'
    },
    {
      key: 'locator',
      tab: 'Locator'
    },
    {
      key: 'country',
      tab: 'Country'
    },
    {
      key: 'all',
      tab: 'Any station'
    }
  ]

  const [senderActiveTab, setSenderActiveTab] = useState('locator')
  const [receiverActiveTab, setReceiverActiveTab] = useState('all')

  const requiredTabs = ['callsign', 'locator']
  // ensure that one of receiver or sender is always callsign or locator
  const tabListReceiver = tabListBase.map(tab =>
    requiredTabs.includes(senderActiveTab)
      ? tab
      : requiredTabs.includes(tab.key)
      ? tab
      : { ...tab, disabled: true }
  )

  const tabListSender = tabListBase.map(tab =>
    requiredTabs.includes(receiverActiveTab)
      ? tab
      : requiredTabs.includes(tab.key)
      ? tab
      : { ...tab, disabled: true }
  )

  const sender = {
    callsign: (
      <form
        onSubmit={e => {
          e.preventDefault()
          const callsign = e.target[0].value.toUpperCase()
          setFilters(f => ({ ...f, sender: { callsign } }))
        }}
      >
        <Input.Group compact style={{ display: 'flex' }}>
          <Input placeholder='Callsign' prefix={<UserOutlined />} />
          <Button type='primary' htmlType='submit'>
            Filter
          </Button>
        </Input.Group>
      </form>
    ),
    locator: (
      <form
        onSubmit={e => {
          e.preventDefault()
          const locator = e.target[0].value.toUpperCase()
          setFilters(f => ({ ...f, sender: { locator } }))
        }}
      >
        <Input.Group compact style={{ display: 'flex' }}>
          <Input placeholder='Grid locator' prefix={<TableOutlined />} />

          <Button type='primary' htmlType='submit'>
            Filter
          </Button>
        </Input.Group>
      </form>
    ),
    country: (
      <Select
        defaultValue={'+'}
        options={countryOptions}
        showSearch
        style={{ flex: '1' }}
        allowClear={false}
        onChange={value => {
          setFilters(f => ({ ...f, sender: { country: value } }))
        }}
        filterOption={(input, option) => {
          const { label } = option
          try {
            return (label || '').toLowerCase().includes(input.toLowerCase())
          } catch (e) {}
        }}
      />
    )
  }

  const receiver = {
    callsign: (
      <form
        onSubmit={e => {
          e.preventDefault()
          const callsign = e.target[0].value.toUpperCase()
          setFilters(f => ({ ...f, receiver: { callsign } }))
        }}
      >
        <Input.Group compact style={{ display: 'flex' }}>
          <Input placeholder='Callsign' prefix={<UserOutlined />} />

          <Button type='primary' htmlType='submit'>
            Filter
          </Button>
        </Input.Group>
      </form>
    ),
    locator: (
      <form
        onSubmit={e => {
          e.preventDefault()
          const locator = e.target[0].value.toUpperCase()
          setFilters(f => ({ ...f, receiver: { locator } }))
        }}
      >
        <Input.Group compact style={{ display: 'flex' }}>
          <Input placeholder='Grid locator' prefix={<TableOutlined />} />

          <Button type='primary' htmlType='submit'>
            Filter
          </Button>
        </Input.Group>
      </form>
    ),
    country: (
      <Select
        defaultValue={'+'}
        options={countryOptions}
        showSearch
        style={{ flex: '1' }}
        allowClear={false}
        onChange={value => {
          setFilters(f => ({
            ...f,
            receiver: { country: value }
          }))
        }}
        filterOption={(input, option) => {
          const { label } = option
          try {
            return (label || '').toLowerCase().includes(input.toLowerCase())
          } catch (e) {}
        }}
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          height: 'calc(100vh - 300px)',
          width: '100vw',
          position: 'relative'
        }}
      >
        <DeckGL
          initialViewState={deckViewState}
          controller={true}
          layers={layers}
          views={new MapView({ repeat: true })}
          getTooltip={({ object }) => {
            if (object) {
              const { from, to, frequency, mode, band, t } = object
              const prettyDate = formatRFC7231(new Date(t * 1000))
              const dateAgo = formatDistance(new Date(t * 1000), new Date(), {
                addSuffix: true
              })
              return {
                html: `<h2>${from.callsign} spotted by ${to.callsign}</h2><div>${prettyDate}</div><div>${dateAgo}</div><div>${frequency} ${mode} ${band}</div>`
              }
            }
          }}
          pickingRadius={5}
        >
          <Map
            mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
            mapStyle={'mapbox://styles/mapbox/dark-v11'}
          />
        </DeckGL>
      </div>
      <Drawer
        placement='bottom'
        open={drawerOpen}
        closable={false}
        height='300px'
        mask={false}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'stretch',
            margin: '8px'
          }}
        >
          <Card bordered={false} size='small' style={{ marginRight: '8px' }}>
            <Space direction='vertical'>
              <div style={{ marginRight: '12px' }}>
                {loading ? (
                  <span>
                    <SyncOutlined spin /> Connecting...
                  </span>
                ) : (
                  <span>
                    <CheckCircleTwoTone twoToneColor='#52c41a' /> Connected
                  </span>
                )}
              </div>
              <Statistic
                title='Spots received'
                loading={loading || !dataCount.next}
                formatter={value => <animated.span>{value}</animated.span>}
                value={interpolator.dataCount.interpolate(x => x.toFixed(0))}
              />
              <Statistic
                title='Avg spots/min'
                loading={
                  loading || !spotsPerSec.next || spotsPerSec.next > 1000
                }
                formatter={value => <animated.span>{value}</animated.span>}
                value={interpolator.spotsPerSec.interpolate(x => x.toFixed(0))}
              />
            </Space>
          </Card>
          <Card bordered={false} size='small' style={{ marginRight: '8px' }}>
            <Space direction='vertical'>
              <Select
                defaultValue={'+'}
                options={modeOptions}
                showSearch
                style={{ width: 200 }}
                allowClear={false}
                onChange={value => {
                  setCurrentMode(value)
                }}
              />
              <Select
                defaultValue={'+'}
                options={bandOptions}
                showSearch
                style={{ width: 200 }}
                allowClear={false}
                onChange={value => setCurrentBand(value)}
              />
              <Checkbox
                onChange={e => {
                  setFilters(f => ({ ...f, viceVersa: !e.target.checked }))
                }}
                checked={!filters.viceVersa}
              >
                Filter by <span style={{ color: 'red' }}>senders</span> and{' '}
                <span style={{ color: 'green' }}>receivers</span>
              </Checkbox>

              <Checkbox
                onChange={e => {
                  setShowTransmitterBubbles(e.target.checked)
                }}
                checked={showTransmitterBubbles}
              >
                Show transmitter bubbles
              </Checkbox>
              <Space>
                Marker lifespan{' '}
                <Select
                  defaultValue={Infinity}
                  options={ttlOptions}
                  style={{ flex: 1 }}
                  onChange={value => {
                    setTtl(value)
                  }}
                  value={ttl}
                />
              </Space>
            </Space>
          </Card>
          <Card
            style={{
              flex: '1',
              border:
                '1px solid ' + filters.viceVersa ? 'rgba(191,64,191)' : 'red',
              marginRight: '8px'
            }}
            tabProps={{
              size: 'small'
            }}
            bordered={false}
            size='small'
            tabList={tabListSender}
            defaultActiveTabKey='callsign'
            activeTabKey={senderActiveTab}
            onTabChange={key => {
              setSenderActiveTab(key)
              if (key === 'all') {
                setFilters(f => ({ ...f, sender: [] }))
              }
            }}
            title={`${filters.viceVersa ? 'One side' : 'Sender'} is...`}
          >
            {sender[senderActiveTab]}
          </Card>
          <Card
            style={{
              flex: '1',
              border:
                '1px solid ' + filters.viceVersa ? 'rgba(191,64,191)' : 'green'
            }}
            bordered={false}
            size='small'
            tabList={tabListReceiver}
            tabProps={{
              size: 'small'
            }}
            defaultActiveTabKey='callsign'
            activeTabKey={receiverActiveTab}
            onTabChange={key => {
              setReceiverActiveTab(key)
              if (key === 'all') {
                setFilters(f => ({ ...f, receiver: [] }))
              }
            }}
            title={`${filters.viceVersa ? 'Other side' : 'Receiver'} is...`}
          >
            {receiver[receiverActiveTab]}
          </Card>
          <div style={{ flex: '1' }}></div>
        </div>
      </Drawer>
    </div>
  )
}

export default App
