--
-- PostgreSQL database dump
--

\restrict hUSDvReWhU4jZ82v5chgvaqXTITitS4u2GNlgGDvonROGeqYaVM6bPf6ccig0vt

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alerts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.alerts (
    alert_id bigint NOT NULL,
    zone_id integer,
    sensor_id integer,
    metric_id integer,
    threshold_id integer,
    triggered_at timestamp without time zone NOT NULL,
    resolved_at timestamp without time zone,
    severity character varying(20) NOT NULL,
    title character varying(200) NOT NULL,
    message text NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying,
    source_name character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.alerts OWNER TO postgres;

--
-- Name: alerts_alert_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.alerts_alert_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.alerts_alert_id_seq OWNER TO postgres;

--
-- Name: alerts_alert_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.alerts_alert_id_seq OWNED BY public.alerts.alert_id;


--
-- Name: crowd_observations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.crowd_observations (
    crowd_obs_id bigint NOT NULL,
    zone_id integer NOT NULL,
    sensor_id integer,
    recorded_at timestamp without time zone NOT NULL,
    people_count integer NOT NULL,
    capacity_reference integer,
    occupancy_ratio numeric(5,4),
    busyness_level character varying(30),
    source_name character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.crowd_observations OWNER TO postgres;

--
-- Name: crowd_observations_crowd_obs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.crowd_observations_crowd_obs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.crowd_observations_crowd_obs_id_seq OWNER TO postgres;

--
-- Name: crowd_observations_crowd_obs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.crowd_observations_crowd_obs_id_seq OWNED BY public.crowd_observations.crowd_obs_id;


--
-- Name: dashboard_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.dashboard_messages (
    message_id bigint NOT NULL,
    zone_id integer,
    title character varying(200) NOT NULL,
    body text NOT NULL,
    category character varying(50),
    priority integer DEFAULT 1,
    valid_from timestamp without time zone,
    valid_to timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.dashboard_messages OWNER TO postgres;

--
-- Name: dashboard_messages_message_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.dashboard_messages_message_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.dashboard_messages_message_id_seq OWNER TO postgres;

--
-- Name: dashboard_messages_message_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.dashboard_messages_message_id_seq OWNED BY public.dashboard_messages.message_id;


--
-- Name: metric_thresholds; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.metric_thresholds (
    threshold_id integer NOT NULL,
    metric_id integer NOT NULL,
    zone_type character varying(50),
    min_value numeric(12,4),
    max_value numeric(12,4),
    severity character varying(20) NOT NULL,
    label character varying(100) NOT NULL,
    color_code character varying(20),
    icon_name character varying(100),
    source_reference text,
    notes text
);


ALTER TABLE public.metric_thresholds OWNER TO postgres;

--
-- Name: metric_thresholds_threshold_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.metric_thresholds_threshold_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.metric_thresholds_threshold_id_seq OWNER TO postgres;

--
-- Name: metric_thresholds_threshold_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.metric_thresholds_threshold_id_seq OWNED BY public.metric_thresholds.threshold_id;


--
-- Name: metrics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.metrics (
    metric_id integer NOT NULL,
    metric_name character varying(100) NOT NULL,
    display_name character varying(100) NOT NULL,
    unit character varying(30),
    category character varying(50),
    description text
);


ALTER TABLE public.metrics OWNER TO postgres;

--
-- Name: metrics_metric_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.metrics_metric_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.metrics_metric_id_seq OWNER TO postgres;

--
-- Name: metrics_metric_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.metrics_metric_id_seq OWNED BY public.metrics.metric_id;


--
-- Name: sensor_readings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sensor_readings (
    reading_id bigint NOT NULL,
    sensor_id integer NOT NULL,
    metric_id integer NOT NULL,
    recorded_at timestamp without time zone NOT NULL,
    value_numeric numeric(12,4),
    value_text character varying(255),
    quality_flag character varying(30),
    source_record_id character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.sensor_readings OWNER TO postgres;

--
-- Name: sensor_readings_reading_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sensor_readings_reading_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sensor_readings_reading_id_seq OWNER TO postgres;

--
-- Name: sensor_readings_reading_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sensor_readings_reading_id_seq OWNED BY public.sensor_readings.reading_id;


--
-- Name: sensor_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sensor_types (
    sensor_type_id integer NOT NULL,
    type_name character varying(100) NOT NULL,
    description text
);


ALTER TABLE public.sensor_types OWNER TO postgres;

--
-- Name: sensor_types_sensor_type_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sensor_types_sensor_type_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sensor_types_sensor_type_id_seq OWNER TO postgres;

--
-- Name: sensor_types_sensor_type_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sensor_types_sensor_type_id_seq OWNED BY public.sensor_types.sensor_type_id;


--
-- Name: sensors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sensors (
    sensor_id integer NOT NULL,
    sensor_name character varying(100) NOT NULL,
    sensor_type character varying(50),
    zone_id integer,
    installation_date timestamp without time zone
);


ALTER TABLE public.sensors OWNER TO postgres;

--
-- Name: sensors_sensor_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sensors_sensor_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sensors_sensor_id_seq OWNER TO postgres;

--
-- Name: sensors_sensor_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sensors_sensor_id_seq OWNED BY public.sensors.sensor_id;


--
-- Name: species_detections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.species_detections (
    detection_id bigint NOT NULL,
    sensor_id integer,
    zone_id integer,
    recorded_at timestamp without time zone NOT NULL,
    species_name character varying(120) NOT NULL,
    confidence_score numeric(5,4),
    detection_type character varying(50),
    source_name character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.species_detections OWNER TO postgres;

--
-- Name: species_detections_detection_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.species_detections_detection_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.species_detections_detection_id_seq OWNER TO postgres;

--
-- Name: species_detections_detection_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.species_detections_detection_id_seq OWNED BY public.species_detections.detection_id;


--
-- Name: traffic_observations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.traffic_observations (
    traffic_obs_id bigint NOT NULL,
    zone_id integer,
    recorded_at timestamp without time zone NOT NULL,
    pedestrian_count integer DEFAULT 0,
    bicycle_count integer DEFAULT 0,
    vehicle_count integer DEFAULT 0,
    vehicle_type_breakdown jsonb,
    source_name character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    segment_id bigint,
    uptime numeric(5,4)
);


ALTER TABLE public.traffic_observations OWNER TO postgres;

--
-- Name: traffic_observations_traffic_obs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.traffic_observations_traffic_obs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.traffic_observations_traffic_obs_id_seq OWNER TO postgres;

--
-- Name: traffic_observations_traffic_obs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.traffic_observations_traffic_obs_id_seq OWNED BY public.traffic_observations.traffic_obs_id;


--
-- Name: water_quality_observations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.water_quality_observations (
    water_obs_id bigint NOT NULL,
    zone_id integer,
    sensor_id integer,
    recorded_at timestamp without time zone NOT NULL,
    water_temperature numeric(6,2),
    ph numeric(4,2),
    turbidity numeric(8,2),
    ecoli_level numeric(10,2),
    sewage_risk boolean,
    swim_status character varying(20),
    prediction_score numeric(6,3),
    source_name character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.water_quality_observations OWNER TO postgres;

--
-- Name: water_quality_observations_water_obs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.water_quality_observations_water_obs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.water_quality_observations_water_obs_id_seq OWNER TO postgres;

--
-- Name: water_quality_observations_water_obs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.water_quality_observations_water_obs_id_seq OWNED BY public.water_quality_observations.water_obs_id;


--
-- Name: zones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.zones (
    zone_id integer NOT NULL,
    zone_name character varying(100) NOT NULL,
    zone_type character varying(50),
    description text
);


ALTER TABLE public.zones OWNER TO postgres;

--
-- Name: zones_zone_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.zones_zone_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.zones_zone_id_seq OWNER TO postgres;

--
-- Name: zones_zone_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.zones_zone_id_seq OWNED BY public.zones.zone_id;


--
-- Name: alerts alert_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alerts ALTER COLUMN alert_id SET DEFAULT nextval('public.alerts_alert_id_seq'::regclass);


--
-- Name: crowd_observations crowd_obs_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crowd_observations ALTER COLUMN crowd_obs_id SET DEFAULT nextval('public.crowd_observations_crowd_obs_id_seq'::regclass);


--
-- Name: dashboard_messages message_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dashboard_messages ALTER COLUMN message_id SET DEFAULT nextval('public.dashboard_messages_message_id_seq'::regclass);


--
-- Name: metric_thresholds threshold_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metric_thresholds ALTER COLUMN threshold_id SET DEFAULT nextval('public.metric_thresholds_threshold_id_seq'::regclass);


--
-- Name: metrics metric_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metrics ALTER COLUMN metric_id SET DEFAULT nextval('public.metrics_metric_id_seq'::regclass);


--
-- Name: sensor_readings reading_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sensor_readings ALTER COLUMN reading_id SET DEFAULT nextval('public.sensor_readings_reading_id_seq'::regclass);


--
-- Name: sensor_types sensor_type_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sensor_types ALTER COLUMN sensor_type_id SET DEFAULT nextval('public.sensor_types_sensor_type_id_seq'::regclass);


--
-- Name: sensors sensor_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sensors ALTER COLUMN sensor_id SET DEFAULT nextval('public.sensors_sensor_id_seq'::regclass);


--
-- Name: species_detections detection_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.species_detections ALTER COLUMN detection_id SET DEFAULT nextval('public.species_detections_detection_id_seq'::regclass);


--
-- Name: traffic_observations traffic_obs_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.traffic_observations ALTER COLUMN traffic_obs_id SET DEFAULT nextval('public.traffic_observations_traffic_obs_id_seq'::regclass);


--
-- Name: water_quality_observations water_obs_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.water_quality_observations ALTER COLUMN water_obs_id SET DEFAULT nextval('public.water_quality_observations_water_obs_id_seq'::regclass);


--
-- Name: zones zone_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.zones ALTER COLUMN zone_id SET DEFAULT nextval('public.zones_zone_id_seq'::regclass);


--
-- Data for Name: alerts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.alerts (alert_id, zone_id, sensor_id, metric_id, threshold_id, triggered_at, resolved_at, severity, title, message, status, source_name, created_at) FROM stdin;
\.


--
-- Data for Name: crowd_observations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.crowd_observations (crowd_obs_id, zone_id, sensor_id, recorded_at, people_count, capacity_reference, occupancy_ratio, busyness_level, source_name, created_at) FROM stdin;
\.


--
-- Data for Name: dashboard_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.dashboard_messages (message_id, zone_id, title, body, category, priority, valid_from, valid_to, created_at) FROM stdin;
\.


--
-- Data for Name: metric_thresholds; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.metric_thresholds (threshold_id, metric_id, zone_type, min_value, max_value, severity, label, color_code, icon_name, source_reference, notes) FROM stdin;
\.


--
-- Data for Name: metrics; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.metrics (metric_id, metric_name, display_name, unit, category, description) FROM stdin;
1	people_count	People Count	persons	crowd	Number of detected people
2	occupancy_ratio	Occupancy Ratio	ratio	crowd	Current occupancy relative to capacity
3	noise_db	Noise Level	dB	sound	Measured sound level in decibels
4	water_temperature	Water Temperature	°C	water	Measured water temperature
5	ecoli_level	E. coli Level	cfu/100ml	water	Estimated or measured E. coli concentration
6	pm25	PM2.5	µg/m3	air	Fine particulate matter concentration
7	no2	NO2	µg/m3	air	Nitrogen dioxide concentration
8	soil_moisture	Soil Moisture	%	environment	Measured soil moisture
9	pedestrian_count	Pedestrian Count	persons	traffic	Number of pedestrians detected
10	bicycle_count	Bicycle Count	bicycles	traffic	Number of bicycles detected
11	vehicle_count	Vehicle Count	vehicles	traffic	Number of vehicles detected
12	bird_detection_count	Bird Detection Count	detections	biodiversity	Detected bird activity count
\.


--
-- Data for Name: sensor_readings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sensor_readings (reading_id, sensor_id, metric_id, recorded_at, value_numeric, value_text, quality_flag, source_record_id, created_at) FROM stdin;
\.


--
-- Data for Name: sensor_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sensor_types (sensor_type_id, type_name, description) FROM stdin;
\.


--
-- Data for Name: sensors; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sensors (sensor_id, sensor_name, sensor_type, zone_id, installation_date) FROM stdin;
\.


--
-- Data for Name: species_detections; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.species_detections (detection_id, sensor_id, zone_id, recorded_at, species_name, confidence_score, detection_type, source_name, created_at) FROM stdin;
\.


--
-- Data for Name: traffic_observations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.traffic_observations (traffic_obs_id, zone_id, recorded_at, pedestrian_count, bicycle_count, vehicle_count, vehicle_type_breakdown, source_name, created_at, segment_id, uptime) FROM stdin;
4	1	2026-03-07 08:00:00	40	27	8	\N	Telraam	2026-03-08 15:48:07.30094	9000006266	0.9950
5	1	2026-03-07 09:00:00	23	36	4	\N	Telraam	2026-03-08 15:48:07.30094	9000006266	0.9958
6	1	2026-03-07 10:00:00	24	50	16	\N	Telraam	2026-03-08 15:48:07.30094	9000006266	0.9936
7	1	2026-03-07 08:00:00	40	27	8	\N	Telraam	2026-03-08 15:48:10.013027	9000006266	0.9950
8	1	2026-03-07 09:00:00	23	36	4	\N	Telraam	2026-03-08 15:48:10.013027	9000006266	0.9958
9	1	2026-03-07 10:00:00	24	50	16	\N	Telraam	2026-03-08 15:48:10.013027	9000006266	0.9936
10	1	2026-03-07 00:00:00	0	0	0	\N	Telraam	2026-03-08 15:58:38.085023	9000006266	0.9889
11	1	2026-03-07 01:00:00	0	0	0	\N	Telraam	2026-03-08 15:58:38.085023	9000006266	0.9886
12	1	2026-03-07 02:00:00	0	0	0	\N	Telraam	2026-03-08 15:58:38.085023	9000006266	0.9889
13	1	2026-03-07 03:00:00	0	0	0	\N	Telraam	2026-03-08 15:58:38.085023	9000006266	0.9769
14	1	2026-03-07 04:00:00	0	0	0	\N	Telraam	2026-03-08 15:58:38.085023	9000006266	0.9972
15	1	2026-03-07 05:00:00	0	0	0	\N	Telraam	2026-03-08 15:58:38.085023	9000006266	0.9969
16	1	2026-03-07 06:00:00	2	12	4	\N	Telraam	2026-03-08 15:58:38.085023	9000006266	0.9897
17	1	2026-03-07 07:00:00	20	14	3	\N	Telraam	2026-03-08 15:58:38.085023	9000006266	0.9886
18	1	2026-03-07 08:00:00	40	27	8	\N	Telraam	2026-03-08 15:58:38.085023	9000006266	0.9950
19	1	2026-03-07 09:00:00	23	36	4	\N	Telraam	2026-03-08 15:58:38.085023	9000006266	0.9958
20	1	2026-03-07 10:00:00	24	50	16	\N	Telraam	2026-03-08 15:58:38.085023	9000006266	0.9936
21	1	2026-03-07 11:00:00	55	57	7	\N	Telraam	2026-03-08 15:58:38.085023	9000006266	0.9914
22	1	2026-03-07 12:00:00	47	54	15	\N	Telraam	2026-03-08 15:58:38.085023	9000006266	0.9914
23	1	2026-03-07 13:00:00	57	66	9	\N	Telraam	2026-03-08 15:58:38.085023	9000006266	0.9917
24	1	2026-03-07 14:00:00	48	45	8	\N	Telraam	2026-03-08 15:58:38.085023	9000006266	0.9953
25	1	2026-03-07 15:00:00	33	75	5	\N	Telraam	2026-03-08 15:58:38.085023	9000006266	0.9928
26	1	2026-03-07 16:00:00	37	56	3	\N	Telraam	2026-03-08 15:58:38.085023	9000006266	0.9953
27	1	2026-03-07 17:00:00	21	26	4	\N	Telraam	2026-03-08 15:58:38.085023	9000006266	0.9925
28	1	2026-03-07 18:00:00	0	0	0	\N	Telraam	2026-03-08 15:58:38.085023	9000006266	0.9969
29	1	2026-03-07 19:00:00	0	0	0	\N	Telraam	2026-03-08 15:58:38.085023	9000006266	0.9972
30	1	2026-03-07 20:00:00	0	0	0	\N	Telraam	2026-03-08 15:58:38.085023	9000006266	0.9969
31	1	2026-03-07 21:00:00	0	0	0	\N	Telraam	2026-03-08 15:58:38.085023	9000006266	0.9883
32	1	2026-03-07 22:00:00	0	0	0	\N	Telraam	2026-03-08 15:58:38.085023	9000006266	0.9897
33	1	2026-03-07 23:00:00	0	0	0	\N	Telraam	2026-03-08 15:58:38.085023	9000006266	0.9889
\.


--
-- Data for Name: water_quality_observations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.water_quality_observations (water_obs_id, zone_id, sensor_id, recorded_at, water_temperature, ph, turbidity, ecoli_level, sewage_risk, swim_status, prediction_score, source_name, created_at) FROM stdin;
\.


--
-- Data for Name: zones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.zones (zone_id, zone_name, zone_type, description) FROM stdin;
1	General Marineterrein	general	Overall Marineterrein area
2	Swimming Area	recreation	Public swimming zone
3	Picnic Lawn	recreation	Picnic and relaxation grass area
4	North Entrance	entrance	Main entrance from Kattenburgerstraat
5	South Entrance	entrance	Entrance from Oostenburgergracht
6	Green Roof	environment	Green roof ecological monitoring area
\.


--
-- Name: alerts_alert_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.alerts_alert_id_seq', 1, false);


--
-- Name: crowd_observations_crowd_obs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.crowd_observations_crowd_obs_id_seq', 1, false);


--
-- Name: dashboard_messages_message_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.dashboard_messages_message_id_seq', 1, false);


--
-- Name: metric_thresholds_threshold_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.metric_thresholds_threshold_id_seq', 1, false);


--
-- Name: metrics_metric_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.metrics_metric_id_seq', 24, true);


--
-- Name: sensor_readings_reading_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sensor_readings_reading_id_seq', 1, false);


--
-- Name: sensor_types_sensor_type_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sensor_types_sensor_type_id_seq', 1, false);


--
-- Name: sensors_sensor_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sensors_sensor_id_seq', 1, false);


--
-- Name: species_detections_detection_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.species_detections_detection_id_seq', 1, false);


--
-- Name: traffic_observations_traffic_obs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.traffic_observations_traffic_obs_id_seq', 33, true);


--
-- Name: water_quality_observations_water_obs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.water_quality_observations_water_obs_id_seq', 1, false);


--
-- Name: zones_zone_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.zones_zone_id_seq', 6, true);


--
-- Name: alerts alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_pkey PRIMARY KEY (alert_id);


--
-- Name: crowd_observations crowd_observations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crowd_observations
    ADD CONSTRAINT crowd_observations_pkey PRIMARY KEY (crowd_obs_id);


--
-- Name: dashboard_messages dashboard_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dashboard_messages
    ADD CONSTRAINT dashboard_messages_pkey PRIMARY KEY (message_id);


--
-- Name: metric_thresholds metric_thresholds_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metric_thresholds
    ADD CONSTRAINT metric_thresholds_pkey PRIMARY KEY (threshold_id);


--
-- Name: metrics metrics_metric_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metrics
    ADD CONSTRAINT metrics_metric_name_key UNIQUE (metric_name);


--
-- Name: metrics metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metrics
    ADD CONSTRAINT metrics_pkey PRIMARY KEY (metric_id);


--
-- Name: sensor_readings sensor_readings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sensor_readings
    ADD CONSTRAINT sensor_readings_pkey PRIMARY KEY (reading_id);


--
-- Name: sensor_types sensor_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sensor_types
    ADD CONSTRAINT sensor_types_pkey PRIMARY KEY (sensor_type_id);


--
-- Name: sensor_types sensor_types_type_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sensor_types
    ADD CONSTRAINT sensor_types_type_name_key UNIQUE (type_name);


--
-- Name: sensors sensors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sensors
    ADD CONSTRAINT sensors_pkey PRIMARY KEY (sensor_id);


--
-- Name: species_detections species_detections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.species_detections
    ADD CONSTRAINT species_detections_pkey PRIMARY KEY (detection_id);


--
-- Name: traffic_observations traffic_observations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.traffic_observations
    ADD CONSTRAINT traffic_observations_pkey PRIMARY KEY (traffic_obs_id);


--
-- Name: water_quality_observations water_quality_observations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.water_quality_observations
    ADD CONSTRAINT water_quality_observations_pkey PRIMARY KEY (water_obs_id);


--
-- Name: zones zones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.zones
    ADD CONSTRAINT zones_pkey PRIMARY KEY (zone_id);


--
-- Name: idx_alerts_status_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_alerts_status_time ON public.alerts USING btree (status, triggered_at DESC);


--
-- Name: idx_crowd_zone_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_crowd_zone_time ON public.crowd_observations USING btree (zone_id, recorded_at DESC);


--
-- Name: idx_sensor_readings_metric_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sensor_readings_metric_time ON public.sensor_readings USING btree (metric_id, recorded_at DESC);


--
-- Name: idx_sensor_readings_sensor_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sensor_readings_sensor_time ON public.sensor_readings USING btree (sensor_id, recorded_at DESC);


--
-- Name: idx_sensors_zone_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sensors_zone_id ON public.sensors USING btree (zone_id);


--
-- Name: idx_species_zone_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_species_zone_time ON public.species_detections USING btree (zone_id, recorded_at DESC);


--
-- Name: idx_traffic_zone_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_traffic_zone_time ON public.traffic_observations USING btree (zone_id, recorded_at DESC);


--
-- Name: idx_water_zone_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_water_zone_time ON public.water_quality_observations USING btree (zone_id, recorded_at DESC);


--
-- Name: alerts alerts_metric_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_metric_id_fkey FOREIGN KEY (metric_id) REFERENCES public.metrics(metric_id);


--
-- Name: alerts alerts_sensor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_sensor_id_fkey FOREIGN KEY (sensor_id) REFERENCES public.sensors(sensor_id);


--
-- Name: alerts alerts_threshold_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_threshold_id_fkey FOREIGN KEY (threshold_id) REFERENCES public.metric_thresholds(threshold_id);


--
-- Name: alerts alerts_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.zones(zone_id);


--
-- Name: crowd_observations crowd_observations_sensor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crowd_observations
    ADD CONSTRAINT crowd_observations_sensor_id_fkey FOREIGN KEY (sensor_id) REFERENCES public.sensors(sensor_id);


--
-- Name: crowd_observations crowd_observations_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crowd_observations
    ADD CONSTRAINT crowd_observations_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.zones(zone_id);


--
-- Name: dashboard_messages dashboard_messages_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dashboard_messages
    ADD CONSTRAINT dashboard_messages_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.zones(zone_id);


--
-- Name: metric_thresholds metric_thresholds_metric_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metric_thresholds
    ADD CONSTRAINT metric_thresholds_metric_id_fkey FOREIGN KEY (metric_id) REFERENCES public.metrics(metric_id);


--
-- Name: sensor_readings sensor_readings_metric_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sensor_readings
    ADD CONSTRAINT sensor_readings_metric_id_fkey FOREIGN KEY (metric_id) REFERENCES public.metrics(metric_id);


--
-- Name: sensor_readings sensor_readings_sensor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sensor_readings
    ADD CONSTRAINT sensor_readings_sensor_id_fkey FOREIGN KEY (sensor_id) REFERENCES public.sensors(sensor_id);


--
-- Name: sensors sensors_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sensors
    ADD CONSTRAINT sensors_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.zones(zone_id);


--
-- Name: species_detections species_detections_sensor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.species_detections
    ADD CONSTRAINT species_detections_sensor_id_fkey FOREIGN KEY (sensor_id) REFERENCES public.sensors(sensor_id);


--
-- Name: species_detections species_detections_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.species_detections
    ADD CONSTRAINT species_detections_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.zones(zone_id);


--
-- Name: traffic_observations traffic_observations_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.traffic_observations
    ADD CONSTRAINT traffic_observations_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.zones(zone_id);


--
-- Name: water_quality_observations water_quality_observations_sensor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.water_quality_observations
    ADD CONSTRAINT water_quality_observations_sensor_id_fkey FOREIGN KEY (sensor_id) REFERENCES public.sensors(sensor_id);


--
-- Name: water_quality_observations water_quality_observations_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.water_quality_observations
    ADD CONSTRAINT water_quality_observations_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.zones(zone_id);


--
-- PostgreSQL database dump complete
--

\unrestrict hUSDvReWhU4jZ82v5chgvaqXTITitS4u2GNlgGDvonROGeqYaVM6bPf6ccig0vt

