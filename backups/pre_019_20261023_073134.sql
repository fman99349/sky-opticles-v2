--
-- PostgreSQL database dump
--

\restrict MJX2S7hZiPITNwLfv3JLmckm4cHqechbzFHNywLoTcZo1NehgACkRlNiKcavGUw

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

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
-- Name: admins; Type: TABLE; Schema: public; Owner: sky_opticles_app
--

CREATE TABLE public.admins (
    id bigint NOT NULL,
    name character varying(120) NOT NULL,
    email character varying(180) NOT NULL,
    password_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.admins OWNER TO sky_opticles_app;

--
-- Name: admins_id_seq; Type: SEQUENCE; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE public.admins ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.admins_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: brands; Type: TABLE; Schema: public; Owner: sky_opticles_app
--

CREATE TABLE public.brands (
    id bigint NOT NULL,
    name character varying(120) NOT NULL,
    slug character varying(140) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.brands OWNER TO sky_opticles_app;

--
-- Name: brands_id_seq; Type: SEQUENCE; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE public.brands ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.brands_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: sky_opticles_app
--

CREATE TABLE public.categories (
    id bigint NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(120) NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    parent_id bigint
);


ALTER TABLE public.categories OWNER TO sky_opticles_app;

--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE public.categories ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: exchange_rates; Type: TABLE; Schema: public; Owner: sky_opticles_app
--

CREATE TABLE public.exchange_rates (
    id bigint NOT NULL,
    currency_code character varying(3) NOT NULL,
    rate_to_base numeric(10,4) NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.exchange_rates OWNER TO sky_opticles_app;

--
-- Name: exchange_rates_id_seq; Type: SEQUENCE; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE public.exchange_rates ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.exchange_rates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: lens_option_groups; Type: TABLE; Schema: public; Owner: sky_opticles_app
--

CREATE TABLE public.lens_option_groups (
    id bigint NOT NULL,
    group_key character varying(50) NOT NULL,
    label character varying(100) NOT NULL,
    help_title character varying(200),
    help_body text,
    applies_to text[] NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.lens_option_groups OWNER TO sky_opticles_app;

--
-- Name: lens_option_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE public.lens_option_groups ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.lens_option_groups_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: lens_options; Type: TABLE; Schema: public; Owner: sky_opticles_app
--

CREATE TABLE public.lens_options (
    id bigint NOT NULL,
    group_id bigint NOT NULL,
    option_key character varying(50) NOT NULL,
    label character varying(100) NOT NULL,
    price_delta numeric(10,2) NOT NULL,
    overlay_color character varying(60),
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT lens_options_price_delta_check CHECK ((price_delta >= (0)::numeric))
);


ALTER TABLE public.lens_options OWNER TO sky_opticles_app;

--
-- Name: lens_options_id_seq; Type: SEQUENCE; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE public.lens_options ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.lens_options_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: sky_opticles_app
--

CREATE TABLE public.notifications (
    id bigint NOT NULL,
    customer_id bigint,
    admin_id bigint,
    title character varying(200) NOT NULL,
    message text NOT NULL,
    type character varying(50) DEFAULT 'system'::character varying NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT check_one_recipient CHECK ((((customer_id IS NOT NULL) AND (admin_id IS NULL)) OR ((customer_id IS NULL) AND (admin_id IS NOT NULL))))
);


ALTER TABLE public.notifications OWNER TO sky_opticles_app;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE public.notifications ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.notifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: sky_opticles_app
--

CREATE TABLE public.order_items (
    id bigint NOT NULL,
    order_id bigint NOT NULL,
    product_id bigint,
    variant_id bigint,
    prescription_id bigint,
    product_name character varying(200) NOT NULL,
    product_slug character varying(220),
    variant_sku character varying(80),
    lens_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    base_price numeric(12,2) NOT NULL,
    lens_delta numeric(12,2) DEFAULT 0 NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    quantity integer NOT NULL,
    line_total numeric(12,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    variant_attributes jsonb,
    CONSTRAINT order_items_base_price_check CHECK ((base_price >= (0)::numeric)),
    CONSTRAINT order_items_lens_delta_check CHECK ((lens_delta >= (0)::numeric)),
    CONSTRAINT order_items_line_total_check CHECK ((line_total >= (0)::numeric)),
    CONSTRAINT order_items_quantity_check CHECK ((quantity > 0)),
    CONSTRAINT order_items_unit_price_check CHECK ((unit_price >= (0)::numeric))
);


ALTER TABLE public.order_items OWNER TO sky_opticles_app;

--
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE public.order_items ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.order_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: sky_opticles_app
--

CREATE TABLE public.orders (
    id bigint NOT NULL,
    order_number character varying(20) NOT NULL,
    user_id bigint NOT NULL,
    customer_name character varying(120) NOT NULL,
    customer_email character varying(180) NOT NULL,
    customer_phone character varying(40) NOT NULL,
    shipping_line1 character varying(200) NOT NULL,
    shipping_line2 character varying(200),
    shipping_city character varying(100) NOT NULL,
    shipping_postal_code character varying(20) NOT NULL,
    shipping_province character varying(100) NOT NULL,
    shipping_country character varying(80) DEFAULT 'South Africa'::character varying NOT NULL,
    subtotal numeric(12,2) NOT NULL,
    shipping_cost numeric(12,2) DEFAULT 0 NOT NULL,
    total numeric(12,2) NOT NULL,
    payment_status character varying(20) DEFAULT 'unpaid'::character varying NOT NULL,
    fulfillment_status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    paid_at timestamp with time zone,
    archived boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    currency character varying(3) DEFAULT 'ZAR'::character varying NOT NULL,
    exchange_rate numeric(10,4) DEFAULT 1.0000 NOT NULL,
    base_total numeric(12,2) DEFAULT 0 NOT NULL,
    estimated_delivery_date timestamp with time zone,
    CONSTRAINT orders_fulfillment_status_check CHECK (((fulfillment_status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'shipped'::character varying, 'delivered'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT orders_payment_status_check CHECK (((payment_status)::text = ANY ((ARRAY['unpaid'::character varying, 'paid'::character varying, 'refunded'::character varying])::text[]))),
    CONSTRAINT orders_shipping_cost_check CHECK ((shipping_cost >= (0)::numeric)),
    CONSTRAINT orders_subtotal_check CHECK ((subtotal >= (0)::numeric)),
    CONSTRAINT orders_total_check CHECK ((total >= (0)::numeric))
);


ALTER TABLE public.orders OWNER TO sky_opticles_app;

--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE public.orders ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.orders_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: orders_number_seq; Type: SEQUENCE; Schema: public; Owner: sky_opticles_app
--

CREATE SEQUENCE public.orders_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.orders_number_seq OWNER TO sky_opticles_app;

--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: sky_opticles_app
--

CREATE TABLE public.password_reset_tokens (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    token character varying(10) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.password_reset_tokens OWNER TO sky_opticles_app;

--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE public.password_reset_tokens ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.password_reset_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: prescriptions; Type: TABLE; Schema: public; Owner: sky_opticles_app
--

CREATE TABLE public.prescriptions (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    filename character varying(255) NOT NULL,
    original_name character varying(255) NOT NULL,
    mime_type character varying(100) NOT NULL,
    size_bytes integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT prescriptions_size_bytes_check CHECK ((size_bytes > 0))
);


ALTER TABLE public.prescriptions OWNER TO sky_opticles_app;

--
-- Name: prescriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE public.prescriptions ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.prescriptions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: product_3d_models; Type: TABLE; Schema: public; Owner: sky_opticles_app
--

CREATE TABLE public.product_3d_models (
    id bigint NOT NULL,
    product_id bigint NOT NULL,
    variant_id bigint,
    model_url text NOT NULL,
    format character varying(10) DEFAULT 'glb'::character varying NOT NULL,
    poster_url text,
    file_size_bytes bigint,
    is_primary boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT product_3d_models_format_check CHECK (((format)::text = ANY ((ARRAY['glb'::character varying, 'gltf'::character varying, 'usdz'::character varying])::text[])))
);


ALTER TABLE public.product_3d_models OWNER TO sky_opticles_app;

--
-- Name: product_3d_models_id_seq; Type: SEQUENCE; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE public.product_3d_models ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.product_3d_models_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: product_currency_prices; Type: TABLE; Schema: public; Owner: sky_opticles_app
--

CREATE TABLE public.product_currency_prices (
    id bigint NOT NULL,
    product_id bigint NOT NULL,
    currency_code character varying(3) NOT NULL,
    price numeric(12,2) NOT NULL,
    CONSTRAINT product_currency_prices_price_check CHECK ((price >= (0)::numeric))
);


ALTER TABLE public.product_currency_prices OWNER TO sky_opticles_app;

--
-- Name: product_currency_prices_id_seq; Type: SEQUENCE; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE public.product_currency_prices ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.product_currency_prices_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: product_images; Type: TABLE; Schema: public; Owner: sky_opticles_app
--

CREATE TABLE public.product_images (
    id bigint NOT NULL,
    product_id bigint NOT NULL,
    image_url text NOT NULL,
    alt_text character varying(250),
    is_primary boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    variant_id bigint,
    lens_layer_url text
);


ALTER TABLE public.product_images OWNER TO sky_opticles_app;

--
-- Name: product_images_id_seq; Type: SEQUENCE; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE public.product_images ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.product_images_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: product_types; Type: TABLE; Schema: public; Owner: sky_opticles_app
--

CREATE TABLE public.product_types (
    id bigint NOT NULL,
    key character varying(50) NOT NULL,
    label character varying(100) NOT NULL,
    default_has_configurator boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.product_types OWNER TO sky_opticles_app;

--
-- Name: product_types_id_seq; Type: SEQUENCE; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE public.product_types ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.product_types_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: product_variants; Type: TABLE; Schema: public; Owner: sky_opticles_app
--

CREATE TABLE public.product_variants (
    id bigint NOT NULL,
    product_id bigint NOT NULL,
    sku character varying(80) NOT NULL,
    color character varying(80),
    frame_material character varying(100),
    frame_shape character varying(80),
    size_label character varying(50),
    price_override numeric(12,2),
    stock_quantity integer DEFAULT 0 NOT NULL,
    reorder_level integer DEFAULT 5 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    color_hex character varying(7),
    attributes jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT product_variants_price_override_check CHECK (((price_override IS NULL) OR (price_override >= (0)::numeric))),
    CONSTRAINT product_variants_reorder_level_check CHECK ((reorder_level >= 0)),
    CONSTRAINT product_variants_stock_quantity_check CHECK ((stock_quantity >= 0))
);


ALTER TABLE public.product_variants OWNER TO sky_opticles_app;

--
-- Name: product_variants_id_seq; Type: SEQUENCE; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE public.product_variants ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.product_variants_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: sky_opticles_app
--

CREATE TABLE public.products (
    id bigint NOT NULL,
    category_id bigint NOT NULL,
    brand_id bigint,
    name character varying(200) NOT NULL,
    slug character varying(220) NOT NULL,
    description text,
    product_type character varying(50) NOT NULL,
    price numeric(12,2) NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    has_configurator boolean DEFAULT true NOT NULL,
    condition character varying(20) DEFAULT 'new'::character varying NOT NULL,
    base_currency character varying(3) DEFAULT 'ZAR'::character varying NOT NULL,
    CONSTRAINT products_condition_check CHECK (((condition)::text = ANY ((ARRAY['new'::character varying, 'used'::character varying])::text[]))),
    CONSTRAINT products_price_check CHECK ((price >= (0)::numeric)),
    CONSTRAINT products_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'active'::character varying, 'archived'::character varying])::text[])))
);


ALTER TABLE public.products OWNER TO sky_opticles_app;

--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE public.products ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.products_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: user_addresses; Type: TABLE; Schema: public; Owner: sky_opticles_app
--

CREATE TABLE public.user_addresses (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    label character varying(50),
    recipient_name character varying(120) NOT NULL,
    phone character varying(40) NOT NULL,
    line1 character varying(200) NOT NULL,
    line2 character varying(200),
    city character varying(100) NOT NULL,
    postal_code character varying(20) NOT NULL,
    province character varying(100) NOT NULL,
    country character varying(80) DEFAULT 'South Africa'::character varying NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_addresses OWNER TO sky_opticles_app;

--
-- Name: user_addresses_id_seq; Type: SEQUENCE; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE public.user_addresses ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.user_addresses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: sky_opticles_app
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    name character varying(120) NOT NULL,
    email character varying(180) NOT NULL,
    password_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    phone character varying(40),
    expo_push_token character varying(255)
);


ALTER TABLE public.users OWNER TO sky_opticles_app;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE public.users ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Data for Name: admins; Type: TABLE DATA; Schema: public; Owner: sky_opticles_app
--

COPY public.admins (id, name, email, password_hash, created_at, updated_at) FROM stdin;
1	admin	admin1@gmail.com	$2b$10$MnlQiLgLE8vgczlRJn5LNOZ.yHVwsmRPAmXltATxdY9ntp4NWTlhu	2026-10-17 18:08:19.45383+01	2026-10-21 18:23:40.528857+01
\.


--
-- Data for Name: brands; Type: TABLE DATA; Schema: public; Owner: sky_opticles_app
--

COPY public.brands (id, name, slug, is_active, created_at) FROM stdin;
2	RedBat	redbat	t	2026-10-17 22:46:45.897382+01
1	The Sky Optics	the-sky-optics	t	2026-10-17 18:31:01.79334+01
3	Von Optical	von-optical	t	2026-10-19 14:08:34.338872+01
4	Russel Products	russel-products	t	2026-10-20 17:16:23.464153+01
5	Adidas Clothing	adidas-clothing	t	2026-10-20 17:29:59.457648+01
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: sky_opticles_app
--

COPY public.categories (id, name, slug, description, is_active, created_at, parent_id) FROM stdin;
16	Optics	optics	for glasses	t	2026-10-21 19:19:55.569429+01	\N
18	Lenses	lenses	\N	t	2026-10-21 19:28:40.495389+01	16
20	Machines	machines	\N	t	2026-10-21 19:32:12.108902+01	\N
21	Optical machines	optical-machines	\N	t	2026-10-21 19:32:31.938583+01	20
22	Furnitures	furnitures	\N	t	2026-10-21 19:34:04.957082+01	\N
23	Hospital Machines	hospital-machines	\N	t	2026-10-21 19:36:10.662296+01	20
24	Vehicles	vehicles	\N	t	2026-10-21 19:37:27.710343+01	\N
25	VW	vw	\N	t	2026-10-21 19:37:49.864414+01	24
26	BMW	bmw	\N	t	2026-10-21 19:38:08.252463+01	24
27	Toyota	toyota	\N	t	2026-10-21 19:38:22.048805+01	24
28	Ford	ford	\N	t	2026-10-21 19:38:57.034183+01	24
29	Clothing	clothing	\N	t	2026-10-21 19:39:45.208043+01	\N
30	Shoes	shoes	\N	t	2026-10-21 19:39:58.462298+01	29
31	Jeans	jeans	\N	t	2026-10-21 19:40:16.450588+01	29
32	Shirts	shirts	\N	t	2026-10-21 19:40:27.113455+01	29
33	Tracksuits	tracksuits	\N	t	2026-10-21 19:41:26.339335+01	29
34	Seasonal	seasonal	\N	t	2026-10-21 19:41:55.390958+01	29
35	Takkies & Boots	takkies-boots	\N	t	2026-10-21 19:43:12.52129+01	29
36	Food and Beverages	food-and-beverages	\N	t	2026-10-21 19:51:02.978831+01	\N
37	Burgers	burgers	\N	t	2026-10-21 19:51:30.296156+01	36
38	Drinks	drinks	\N	t	2026-10-21 19:51:43.148779+01	36
39	Fries	fries	\N	t	2026-10-21 19:52:14.904003+01	36
40	Cameras	cameras	\N	t	2026-10-21 20:03:53.092395+01	\N
41	Indoor	indoor	\N	t	2026-10-21 20:04:18.721814+01	40
42	Outdoor	outdoor	\N	t	2026-10-21 20:04:33.204093+01	40
43	Vehicle Cameras	vehicle-cameras	\N	t	2026-10-21 20:04:49.483595+01	40
17	Frames	frames	\N	t	2026-10-21 19:25:47.997176+01	16
19	Sunglasses	sunglasses	\N	t	2026-10-21 19:29:18.320851+01	16
\.


--
-- Data for Name: exchange_rates; Type: TABLE DATA; Schema: public; Owner: sky_opticles_app
--

COPY public.exchange_rates (id, currency_code, rate_to_base, updated_at) FROM stdin;
1	USD	0.0530	2026-10-21 12:07:24.745015+01
2	GBP	0.0420	2026-10-21 12:07:24.745015+01
\.


--
-- Data for Name: lens_option_groups; Type: TABLE DATA; Schema: public; Owner: sky_opticles_app
--

COPY public.lens_option_groups (id, group_key, label, help_title, help_body, applies_to, sort_order, created_at) FROM stdin;
1	lensType	Lens type	What is lens type?	Your prescription type. Single vision corrects one viewing distance (most common). Reading helps up close. Bifocal and progressive correct multiple distances in one lens.	{optical_frame,lenses}	1	2026-10-19 07:35:39.534028+01
2	lensIndex	Lens index	What is lens index?	Higher index = thinner, lighter lens. Choose 1.56 for light prescriptions, 1.61 for medium, 1.67 for strong, 1.74 for very strong.	{optical_frame,lenses}	2	2026-10-19 07:35:39.534028+01
3	edgeThickness	Edge finish	What is edge finish?	Standard edge is the plain cut. Thin and ultra-thin edge are polished thinner for a lighter feel and better aesthetics on strong prescriptions.	{optical_frame,lenses}	3	2026-10-19 07:35:39.534028+01
4	progressiveStyle	Progressive style	Progressive styles	Only relevant if you chose Progressive above. Standard gives a classic corridor. Premium widens it. Digital freeform is fully individualised to your vision pattern.	{optical_frame,lenses}	4	2026-10-19 07:35:39.534028+01
5	tint	Tint	Lens tints	Clear is fully transparent. Grey reduces glare neutrally. Brown warms colours and is great for driving. Green is calm and natural. Rose improves contrast. Blue mirror is reflective and dramatic. Gradient fades from dark to light. Photochromic darkens automatically in sunlight.	{optical_frame,lenses,sunglasses}	5	2026-10-19 07:35:39.534028+01
6	polarization	Polarization	Polarized lenses	Polarized lenses block horizontal light glare from water, snow, roads, and glass. Excellent for driving, fishing, and the beach. Slightly darker look indoors.	{sunglasses}	6	2026-10-19 07:35:39.534028+01
7	coating	Coating	Lens coatings	Anti-reflective reduces glare from screens and lights. Blue-light filter reduces blue-spectrum exposure from devices. AR + blue-light combines both. Scratch-resistant is a hard protective layer.	{optical_frame,lenses,sunglasses}	7	2026-10-19 07:35:39.534028+01
8	contactSchedule	Wearing schedule	Contact lens schedule	How often you replace your lenses. Daily disposables are the healthiest. Bi-weekly and monthly are more economical.	{contact_lenses}	8	2026-10-19 07:35:39.534028+01
9	contactType	Lens correction	Contact lens correction	Sphere corrects basic short- or long-sightedness. Toric corrects astigmatism. Multifocal works like progressive lenses in a contact.	{contact_lenses}	9	2026-10-19 07:35:39.534028+01
10	accessoryFinish	Finish	\N	\N	{accessory}	10	2026-10-19 07:35:39.534028+01
\.


--
-- Data for Name: lens_options; Type: TABLE DATA; Schema: public; Owner: sky_opticles_app
--

COPY public.lens_options (id, group_id, option_key, label, price_delta, overlay_color, sort_order, created_at) FROM stdin;
3	1	reading	Reading	350.00	\N	3	2026-10-19 07:35:39.534028+01
4	1	bifocal	Bifocal	700.00	\N	4	2026-10-19 07:35:39.534028+01
5	1	progressive	Progressive	1200.00	\N	5	2026-10-19 07:35:39.534028+01
6	2	1.50	1.50 - Standard	0.00	\N	1	2026-10-19 07:35:39.534028+01
7	2	1.56	1.56 - Mid-index	200.00	\N	2	2026-10-19 07:35:39.534028+01
8	2	1.61	1.61 - Thin	400.00	\N	3	2026-10-19 07:35:39.534028+01
9	2	1.67	1.67 - Very thin	800.00	\N	4	2026-10-19 07:35:39.534028+01
10	2	1.74	1.74 - Ultra-thin	1400.00	\N	5	2026-10-19 07:35:39.534028+01
11	3	standard	Standard edge	0.00	\N	1	2026-10-19 07:35:39.534028+01
12	3	thin	Thin edge	150.00	\N	2	2026-10-19 07:35:39.534028+01
13	3	ultra	Ultra-thin edge	300.00	\N	3	2026-10-19 07:35:39.534028+01
14	4	standard	Standard progressive	0.00	\N	1	2026-10-19 07:35:39.534028+01
15	4	premium	Premium progressive	500.00	\N	2	2026-10-19 07:35:39.534028+01
16	4	digital	Digital freeform	1000.00	\N	3	2026-10-19 07:35:39.534028+01
17	5	clear	Clear	0.00	\N	1	2026-10-19 07:35:39.534028+01
19	5	brown	Brown	100.00	rgba(120,70,30,0.35)	3	2026-10-19 07:35:39.534028+01
20	5	green	Green	100.00	rgba(30,90,60,0.32)	4	2026-10-19 07:35:39.534028+01
21	5	rose	Rose	120.00	rgba(200,100,120,0.30)	5	2026-10-19 07:35:39.534028+01
22	5	blue_mirror	Blue mirror	250.00	rgba(60,120,200,0.42)	6	2026-10-19 07:35:39.534028+01
23	5	gradient	Gradient	200.00	rgba(50,50,50,0.42)	7	2026-10-19 07:35:39.534028+01
24	5	photochromic	Photochromic	800.00	rgba(80,80,80,0.22)	8	2026-10-19 07:35:39.534028+01
25	6	no	Not polarized	0.00	\N	1	2026-10-19 07:35:39.534028+01
26	6	yes	Polarized	350.00	\N	2	2026-10-19 07:35:39.534028+01
27	7	none	None	0.00	\N	1	2026-10-19 07:35:39.534028+01
28	7	ar	Anti-reflective	250.00	\N	2	2026-10-19 07:35:39.534028+01
29	7	blue	Blue-light filter	400.00	\N	3	2026-10-19 07:35:39.534028+01
30	7	ar_blue	AR + blue-light	550.00	\N	4	2026-10-19 07:35:39.534028+01
31	7	scratch	Scratch-resistant	200.00	\N	5	2026-10-19 07:35:39.534028+01
32	8	daily	Daily disposable	0.00	\N	1	2026-10-19 07:35:39.534028+01
33	8	biweekly	Bi-weekly	0.00	\N	2	2026-10-19 07:35:39.534028+01
34	8	monthly	Monthly	0.00	\N	3	2026-10-19 07:35:39.534028+01
35	9	sphere	Sphere	0.00	\N	1	2026-10-19 07:35:39.534028+01
36	9	toric	Toric (astigmatism)	200.00	\N	2	2026-10-19 07:35:39.534028+01
37	9	multifocal	Multifocal	400.00	\N	3	2026-10-19 07:35:39.534028+01
38	10	standard	Standard	0.00	\N	1	2026-10-19 07:35:39.534028+01
39	10	premium	Premium	100.00	\N	2	2026-10-19 07:35:39.534028+01
40	10	gift	Gift wrapped	150.00	\N	3	2026-10-19 07:35:39.534028+01
18	5	grey	Grey	250.00	rgba(55,55,55,0.38)	2	2026-10-19 07:35:39.534028+01
1	1	plano	Plano (no prescription)	9.99	\N	1	2026-10-19 07:35:39.534028+01
2	1	single	Single vision	10.00	\N	2	2026-10-19 07:35:39.534028+01
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: sky_opticles_app
--

COPY public.notifications (id, customer_id, admin_id, title, message, type, is_read, created_at) FROM stdin;
41	1	\N	Order Placed!	Your order SO-2026-00043 has been received and is being processed.	order	f	2026-10-22 11:48:15.981071+01
42	\N	1	New Order Received	France Witness just placed order SO-2026-00043 for R 959.99.	order	f	2026-10-22 11:48:15.994289+01
43	1	\N	Order Placed!	Your order SO-2026-00044 has been received and is being processed.	order	f	2026-10-22 11:56:49.529126+01
44	\N	1	New Order Received	France Witness just placed order SO-2026-00044 for R 876.74.	order	f	2026-10-22 11:56:49.532692+01
36	\N	1	New Order Received	France Witness just placed order SO-2026-00040 for R 42.	order	t	2026-10-21 17:29:40.403147+01
38	\N	1	New Order Received	France Witness just placed order SO-2026-00041 for R 26.5.	order	t	2026-10-21 18:58:57.911347+01
20	\N	1	New Order Received	France Witness just placed order SO-2026-00032 for R 42.	order	t	2026-10-21 14:36:06.920199+01
16	\N	1	New Order Received	France Witness just placed order SO-2026-00030 for R 999.99.	order	t	2026-10-21 14:06:59.556834+01
14	\N	1	New Order Received	France Witness just placed order SO-2026-00029 for R 999.99.	order	t	2026-10-21 13:59:02.891437+01
12	\N	1	New Order Received	France Witness just placed order SO-2026-00028 for R 999.99.	order	t	2026-10-21 13:57:56.446309+01
10	\N	1	New Order Received	France Witness just placed order SO-2026-00027 for R 999.99.	order	t	2026-10-21 10:31:19.114248+01
8	\N	1	New Order Received	France Witness just placed order SO-2026-00026 for R 458.91.	order	t	2026-10-21 10:06:46.240573+01
6	\N	1	New Order Received	France Witness just placed order SO-2026-00025 for R 45.99.	order	t	2026-10-21 08:23:28.786945+01
4	\N	1	New Order Received	France Witness just placed order SO-2026-00024 for R 89.95.	order	t	2026-10-21 07:37:59.39495+01
2	\N	1	New Order Received	Test Recipient just placed order SO-2026-00023 for R 349.99.	order	t	2026-10-20 17:54:44.535874+01
18	\N	1	New Order Received	France Witness just placed order SO-2026-00031 for R 999.99.	order	t	2026-10-21 14:25:57.413683+01
22	\N	1	New Order Received	France Witness just placed order SO-2026-00033 for R 1.93.	order	t	2026-10-21 16:14:44.47977+01
40	\N	1	New Order Received	France Witness just placed order SO-2026-00042 for R 349.99.	order	t	2026-10-21 19:03:23.761298+01
24	\N	1	New Order Received	France Witness just placed order SO-2026-00034 for R 41.58.	order	t	2026-10-21 16:16:04.718985+01
26	\N	1	New Order Received	Test just placed order SO-2026-00035 for R 999.99.	order	t	2026-10-21 16:31:53.797306+01
28	\N	1	New Order Received	Test just placed order SO-2026-00036 for R 999.99.	order	t	2026-10-21 16:34:38.143034+01
30	\N	1	New Order Received	France Witness just placed order SO-2026-00037 for R 42.	order	t	2026-10-21 17:01:02.308839+01
32	\N	1	New Order Received	France Witness just placed order SO-2026-00038 for R 42.	order	t	2026-10-21 17:10:35.558652+01
34	\N	1	New Order Received	France Witness just placed order SO-2026-00039 for R 42.	order	t	2026-10-21 17:22:32.669889+01
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: sky_opticles_app
--

COPY public.order_items (id, order_id, product_id, variant_id, prescription_id, product_name, product_slug, variant_sku, lens_config, base_price, lens_delta, unit_price, quantity, line_total, created_at, variant_attributes) FROM stdin;
5	4	\N	\N	\N	SunBlazzer	sunblazzer	\N	{"tint": "grey", "coating": "ar", "activity": "driving", "lensType": "bifocal", "frameOnly": false, "lensIndex": "1.74", "variantId": null, "polarization": "yes", "prescription": {"od": {"pd": "", "cyl": "", "sph": "", "axis": ""}, "os": {"pd": "", "cyl": "", "sph": "", "axis": ""}, "uploadId": null, "uploadedFileName": null, "uploadedSizeBytes": null}, "edgeThickness": "standard", "progressiveStyle": "standard"}	399.99	2800.00	3199.99	1	3199.99	2026-10-19 10:05:59.29683+01	\N
4	4	\N	\N	\N	Tortium View Glasses	tortium-view-glasses	\N	{"tint": "clear", "coating": "ar", "activity": "everyday", "lensType": "reading", "frameOnly": false, "lensIndex": "1.61", "variantId": null, "prescription": {"od": {"pd": "", "cyl": "", "sph": "", "axis": ""}, "os": {"pd": "", "cyl": "", "sph": "", "axis": ""}, "uploadId": null, "uploadedFileName": null, "uploadedSizeBytes": null}, "edgeThickness": "standard", "progressiveStyle": "standard"}	24.99	1000.00	1024.99	1	1024.99	2026-10-19 10:05:59.29683+01	\N
9	8	\N	\N	6	Aviator Glasses	aviator-glasses	\N	{"tint": "grey", "coating": "scratch", "activity": "sport", "lensType": "reading", "frameOnly": false, "lensIndex": "1.61", "variantId": null, "polarization": "yes", "prescription": {"od": {"pd": "", "cyl": "", "sph": "", "axis": ""}, "os": {"pd": "", "cyl": "", "sph": "", "axis": ""}, "uploadId": "6", "uploadedFileName": "Document%20(9).PDF", "uploadedSizeBytes": 41764}, "edgeThickness": "thin", "progressiveStyle": "standard"}	99.99	1550.00	1649.99	1	1649.99	2026-10-19 14:16:00.010635+01	\N
10	9	\N	\N	7	Aviator Glasses	aviator-glasses	\N	{"tint": "rose", "coating": "scratch", "activity": "driving", "lensType": "single", "frameOnly": false, "lensIndex": "1.61", "variantId": null, "polarization": "yes", "prescription": {"od": {"pd": "", "cyl": "", "sph": "", "axis": ""}, "os": {"pd": "", "cyl": "", "sph": "", "axis": ""}, "uploadId": "7", "uploadedFileName": "Document%20(9).PDF", "uploadedSizeBytes": 41764}, "edgeThickness": "standard", "progressiveStyle": "standard"}	99.99	1470.00	1569.99	1	1569.99	2026-10-19 16:54:22.810265+01	\N
11	10	\N	\N	\N	Aviator Glasses	aviator-glasses	SKU101	{"tint": "clear", "coating": "none", "activity": "everyday", "lensType": "plano", "frameOnly": true, "lensIndex": "1.50", "variantId": "6", "variantSku": "SKU101", "prescription": {"od": {"pd": "", "cyl": "", "sph": "", "axis": ""}, "os": {"pd": "", "cyl": "", "sph": "", "axis": ""}, "uploadId": null, "uploadedFileName": null, "uploadedSizeBytes": null}, "edgeThickness": "standard", "progressiveStyle": "standard"}	99.99	0.00	99.99	1	99.99	2026-10-19 17:04:47.179855+01	\N
22	21	\N	\N	\N	Test Laptop	test-laptop	LAP-001	{"variantId": "8", "variantSku": "LAP-001"}	15000.00	0.00	15000.00	2	30000.00	2026-10-20 16:40:43.859658+01	{"CPU": "Intel i7", "RAM": "16GB", "Storage": "512GB SSD"}
1	1	\N	\N	\N	DeepSeeK	deepseek	\N	{"frameOnly": false}	199.99	0.00	199.99	2	399.98	2026-10-19 08:45:53.202074+01	\N
2	2	\N	\N	\N	DeepSeeK	deepseek	\N	{"frameOnly": false, "accessoryFinish": "premium"}	199.99	100.00	299.99	1	299.99	2026-10-19 08:48:50.541369+01	\N
3	3	\N	\N	\N	DeepSeeK	deepseek	\N	{"frameOnly": false, "accessoryFinish": "premium"}	199.99	100.00	299.99	1	299.99	2026-10-19 08:49:17.610072+01	\N
6	5	\N	\N	4	Zebra Optics	zebra-optics	\N	{"tint": "grey", "coating": "none", "activity": "sun", "lensType": "reading", "frameOnly": false, "lensIndex": "1.61", "variantId": null, "polarization": "yes", "prescription": {"od": {"pd": "", "cyl": "", "sph": "", "axis": ""}, "os": {"pd": "", "cyl": "", "sph": "", "axis": ""}, "uploadId": "4", "uploadedFileName": "Document%20(9).PDF", "uploadedSizeBytes": 41764}, "edgeThickness": "thin", "progressiveStyle": "standard"}	79.79	1350.00	1429.79	1	1429.79	2026-10-19 11:11:45.120124+01	\N
7	6	\N	\N	\N	Zebra Optics	zebra-optics	\N	{"tint": "grey", "coating": "blue", "activity": "sport", "lensType": "reading", "frameOnly": false, "lensIndex": "1.61", "variantId": null, "polarization": "yes", "prescription": {"od": {"pd": "2 ", "cyl": "1.6", "sph": "1.5", "axis": "2"}, "os": {"pd": "3.7", "cyl": "2.4", "sph": "1 5", "axis": "2"}, "uploadId": null, "uploadedFileName": null, "uploadedSizeBytes": null}, "edgeThickness": "standard", "progressiveStyle": "standard"}	79.79	1600.00	1679.79	1	1679.79	2026-10-19 11:17:23.82814+01	\N
8	7	\N	\N	5	Zebra Optics	zebra-optics	\N	{"tint": "rose", "coating": "none", "activity": "screen", "lensType": "bifocal", "frameOnly": false, "lensIndex": "1.61", "variantId": null, "prescription": {"od": {"pd": "", "cyl": "", "sph": "", "axis": ""}, "os": {"pd": "", "cyl": "", "sph": "", "axis": ""}, "uploadId": "5", "uploadedFileName": "Document%20(9).PDF", "uploadedSizeBytes": 41764}, "edgeThickness": "thin", "progressiveStyle": "standard"}	79.79	1370.00	1449.79	2	2899.58	2026-10-19 14:01:14.295349+01	\N
27	26	\N	\N	\N	Jenny Routers	jenny-routers	\N	{}	458.91	0.00	458.91	1	458.91	2026-10-21 10:06:45.834653+01	\N
25	24	\N	\N	\N	Couch	couch	\N	{}	89.95	0.00	89.95	1	89.95	2026-10-21 07:37:59.015517+01	\N
36	34	\N	\N	\N	Couch	couch	\N	{}	3.78	0.00	3.78	1	3.78	2026-10-21 16:16:04.523591+01	\N
37	35	\N	\N	\N	DJI Mavic 3 Pro	dji-mavic-3-pro	\N	{"frameOnly": false}	999.99	0.00	999.99	1	999.99	2026-10-21 16:31:53.491442+01	\N
23	22	\N	\N	\N	Adidas T-Shirt	adidas-t-shirt	VSAD	{"variantId": "10", "variantSku": "VSAD"}	349.99	0.00	349.99	1	349.99	2026-10-20 17:35:41.122708+01	{"Size": "Medium", "Color": "black", "texture": "soft"}
24	23	\N	\N	\N	Adidas T-Shirt	adidas-t-shirt	\N	{"frameOnly": false}	349.99	0.00	349.99	1	349.99	2026-10-20 17:54:44.222299+01	\N
44	42	\N	\N	\N	Adidas T-Shirt	adidas-t-shirt	VSAD	{"variantId": "10", "variantSku": "VSAD"}	349.99	0.00	349.99	1	349.99	2026-10-21 19:03:23.499247+01	{"Size": "Medium", "Color": "black", "texture": "soft"}
26	25	\N	\N	\N	iPhone 12 Screen Protector	iphone-12-screen-protector	16V	{"variantId": "9", "variantSku": "16V"}	45.99	0.00	45.99	1	45.99	2026-10-21 08:23:28.488592+01	{}
34	33	\N	\N	\N	iPhone 12 Screen Protector	iphone-12-screen-protector	16V	{"variantId": "9", "variantSku": "16V"}	1.93	0.00	1.93	1	1.93	2026-10-21 16:14:44.288641+01	{}
43	41	\N	\N	\N	Air Fryer	air-fryer	\N	{}	26.50	0.00	26.50	1	26.50	2026-10-21 18:58:57.542054+01	\N
35	34	\N	\N	\N	DefyWashingMachines	defywashingmachines	\N	{}	37.80	0.00	37.80	1	37.80	2026-10-21 16:16:04.523591+01	\N
28	27	\N	\N	\N	DJI Mavic 3 Pro	dji-mavic-3-pro	DRONE-MAVIC3	{"variantId": "11", "variantSku": "DRONE-MAVIC3"}	999.99	0.00	999.99	1	999.99	2026-10-21 10:31:18.822048+01	{"Camera": "4/3 CMOS Hasselblad", "Max Range": "100 km", "Flight Time": "43 Minutes"}
29	28	\N	\N	\N	DJI Mavic 3 Pro	dji-mavic-3-pro	DRONE-MAVIC3	{"variantId": "11", "variantSku": "DRONE-MAVIC3"}	999.99	0.00	999.99	1	999.99	2026-10-21 13:57:56.187525+01	{"Camera": "4/3 CMOS Hasselblad", "Max Range": "100 km", "Flight Time": "43 Minutes"}
30	29	\N	\N	\N	DJI Mavic 3 Pro	dji-mavic-3-pro	DRONE-MAVIC3	{"variantId": "11", "variantSku": "DRONE-MAVIC3"}	999.99	0.00	999.99	1	999.99	2026-10-21 13:59:02.773413+01	{"Camera": "4/3 CMOS Hasselblad", "Max Range": "100 km", "Flight Time": "43 Minutes"}
31	30	\N	\N	\N	DJI Mavic 3 Pro	dji-mavic-3-pro	DRONE-MAVIC3	{"variantId": "11", "variantSku": "DRONE-MAVIC3"}	999.99	0.00	999.99	1	999.99	2026-10-21 14:06:59.455643+01	{"Camera": "4/3 CMOS Hasselblad", "Max Range": "100 km", "Flight Time": "43 Minutes"}
38	36	\N	\N	\N	DJI Mavic 3 Pro	dji-mavic-3-pro	\N	{"frameOnly": false}	999.99	0.00	999.99	1	999.99	2026-10-21 16:34:37.880333+01	\N
32	31	\N	\N	\N	DJI Mavic 3 Pro	dji-mavic-3-pro	DRONE-MAVIC3	{"variantId": "11", "variantSku": "DRONE-MAVIC3"}	999.99	0.00	999.99	1	999.99	2026-10-21 14:25:57.227723+01	{"Camera": "4/3 CMOS Hasselblad", "Max Range": "100 km", "Flight Time": "43 Minutes"}
33	32	\N	\N	\N	DJI Mavic 3 Pro	dji-mavic-3-pro	DRONE-MAVIC3	{"variantId": "11", "variantSku": "DRONE-MAVIC3"}	42.00	0.00	42.00	1	42.00	2026-10-21 14:36:06.634758+01	{"Camera": "4/3 CMOS Hasselblad", "Max Range": "100 km", "Flight Time": "43 Minutes"}
39	37	\N	\N	\N	DJI Mavic 3 Pro	dji-mavic-3-pro	DRONE-MAVIC3	{"variantId": "11", "variantSku": "DRONE-MAVIC3"}	42.00	0.00	42.00	1	42.00	2026-10-21 17:01:02.030806+01	{"Camera": "4/3 CMOS Hasselblad", "Max Range": "100 km", "Flight Time": "43 Minutes"}
40	38	\N	\N	\N	DJI Mavic 3 Pro	dji-mavic-3-pro	DRONE-MAVIC3	{"variantId": "11", "variantSku": "DRONE-MAVIC3"}	42.00	0.00	42.00	1	42.00	2026-10-21 17:10:35.372975+01	{"Camera": "4/3 CMOS Hasselblad", "Max Range": "100 km", "Flight Time": "43 Minutes"}
41	39	\N	\N	\N	DJI Mavic 3 Pro	dji-mavic-3-pro	DRONE-MAVIC3	{"variantId": "11", "variantSku": "DRONE-MAVIC3"}	42.00	0.00	42.00	1	42.00	2026-10-21 17:22:32.539312+01	{"Camera": "4/3 CMOS Hasselblad", "Max Range": "100 km", "Flight Time": "43 Minutes"}
42	40	\N	\N	\N	DJI Mavic 3 Pro	dji-mavic-3-pro	DRONE-MAVIC3	{"variantId": "11", "variantSku": "DRONE-MAVIC3"}	42.00	0.00	42.00	1	42.00	2026-10-21 17:29:40.133617+01	{"Camera": "4/3 CMOS Hasselblad", "Max Range": "100 km", "Flight Time": "43 Minutes"}
45	43	18	\N	12	Aviator Glasses	aviator-glasses	\N	{"tint": "grey", "coating": "ar", "activity": "sport", "lensType": "single", "frameOnly": false, "variantId": null, "polarization": "yes", "prescription": {"od": {"pd": "", "cyl": "", "sph": "", "axis": ""}, "os": {"pd": "", "cyl": "", "sph": "", "axis": ""}, "uploadId": "12", "uploadedFileName": "Document%20(9).PDF", "uploadedSizeBytes": 41764}}	99.99	860.00	959.99	1	959.99	2026-10-22 11:48:15.626514+01	\N
46	44	23	12	\N	Fries	fries	Fries Specs	{"variantId": "12", "variantSku": "Fries Specs"}	76.88	0.00	76.88	1	76.88	2026-10-22 11:56:49.391288+01	{"Kg": "1kg", "Pepper": "Paprika peppe", "Source": "Tomato Source", "Viniger": "General Viniger"}
47	44	24	\N	\N	Watcher101	watcher101	\N	{}	799.86	0.00	799.86	1	799.86	2026-10-22 11:56:49.391288+01	\N
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: sky_opticles_app
--

COPY public.orders (id, order_number, user_id, customer_name, customer_email, customer_phone, shipping_line1, shipping_line2, shipping_city, shipping_postal_code, shipping_province, shipping_country, subtotal, shipping_cost, total, payment_status, fulfillment_status, paid_at, archived, deleted_at, created_at, updated_at, currency, exchange_rate, base_total, estimated_delivery_date) FROM stdin;
3	SO-2026-00003	1	Test Recipient	francewitness9@gmail.com	+27 82 123 4567	1 Test Street	\N	Cape Town	8001	Western Cape	South Africa	299.99	0.00	299.99	unpaid	pending	\N	f	2026-10-19 08:53:24.967499+01	2026-10-19 08:49:17.610072+01	2026-10-19 08:53:24.967499+01	ZAR	1.0000	0.00	\N
5	SO-2026-00005	1	France Witness	alphaman706@gmail.com	0767789235	116 R538	116	Mbombela	1240	Mpumalanga	South Africa	1429.79	0.00	1429.79	unpaid	shipped	\N	f	2026-10-19 11:14:52.499533+01	2026-10-19 11:11:45.120124+01	2026-10-19 11:14:52.499533+01	ZAR	1.0000	0.00	\N
4	SO-2026-00004	1	France Witness	francewitness9@gmail.com	0767789235	White river	116	Nelspruit	1240	Mpumalanga	South Africa	4224.98	0.00	4224.98	unpaid	cancelled	\N	f	2026-10-19 11:14:59.926001+01	2026-10-19 10:05:59.29683+01	2026-10-19 11:14:59.926001+01	ZAR	1.0000	0.00	\N
2	SO-2026-00002	1	Lens Test	francewitness9@gmail.com	+27 82 000 1111	2 Lens Lane	\N	Johannesburg	2000	Gauteng	South Africa	299.99	0.00	299.99	unpaid	processing	\N	f	2026-10-19 11:15:06.984752+01	2026-10-19 08:48:50.541369+01	2026-10-19 11:15:06.984752+01	ZAR	1.0000	0.00	\N
1	SO-2026-00001	1	Test Recipient	francewitness9@gmail.com	+27 82 123 4567	1 Test Street	Unit 5	Cape Town	8001	Western Cape	South Africa	399.98	0.00	399.98	paid	processing	2026-10-19 08:53:24.128798+01	t	2026-10-19 11:15:14.407176+01	2026-10-19 08:45:53.202074+01	2026-10-19 11:15:14.407176+01	ZAR	1.0000	0.00	\N
8	SO-2026-00008	1	France Witness	alphaman706@gmail.com	0767789235	116	R538	Nelspruit	1350	Mpumalanga	South Africa	1649.99	0.00	1649.99	unpaid	processing	\N	t	2026-10-19 16:55:30.988463+01	2026-10-19 14:16:00.010635+01	2026-10-19 16:55:30.988463+01	ZAR	1.0000	0.00	\N
6	SO-2026-00006	1	France Witness	alphaman706@gmail.com	0767789235	R538	116	Mbombela	1240	Mpumalanga	South Africa	1679.79	0.00	1679.79	unpaid	pending	\N	f	2026-10-19 16:55:37.94606+01	2026-10-19 11:17:23.82814+01	2026-10-19 16:55:37.94606+01	ZAR	1.0000	0.00	\N
7	SO-2026-00007	1	France Witness	alphaman706@gmail.com	0767789235	R538	116	Mbombela	1240	Mpumalanga	South Africa	2899.58	0.00	2899.58	unpaid	delivered	\N	f	2026-10-19 16:55:45.710041+01	2026-10-19 14:01:14.295349+01	2026-10-19 16:55:45.710041+01	ZAR	1.0000	0.00	\N
9	SO-2026-00009	1	France Witness	alphaman706@gmail.com	0713662410	R538	White river	Nelspruit	1240	Mpumalanga	South Africa	1569.99	0.00	1569.99	unpaid	pending	\N	f	2026-10-21 08:02:23.776238+01	2026-10-19 16:54:22.810265+01	2026-10-21 08:02:23.776238+01	ZAR	1.0000	0.00	\N
10	SO-2026-00010	1	France Witness	alphaman706@gmail.com	0713662410	White river	116	Mbombela	1240	Mpumalanga	South Africa	99.99	0.00	99.99	unpaid	pending	\N	f	2026-10-21 08:02:38.637314+01	2026-10-19 17:04:47.179855+01	2026-10-21 08:02:38.637314+01	ZAR	1.0000	0.00	\N
27	SO-2026-00027	1	France Witness	alphaman706@gmail.com	+27 82 123 4567	123 Main St	\N	Cape Town	8001	Western Cape	South Africa	999.99	0.00	999.99	unpaid	pending	\N	f	2026-10-21 13:57:28.868391+01	2026-10-21 10:31:18.822048+01	2026-10-21 13:57:28.868391+01	ZAR	1.0000	0.00	\N
28	SO-2026-00028	1	France Witness	alphaman706@gmail.com	+27 82 123 4567	123 Main St	\N	Cape Town	8001	Western Cape	South Africa	999.99	0.00	999.99	unpaid	pending	\N	f	2026-10-21 13:58:42.336859+01	2026-10-21 13:57:56.187525+01	2026-10-21 13:58:42.336859+01	ZAR	1.0000	999.99	\N
29	SO-2026-00029	1	France Witness	alphaman706@gmail.com	+27 82 123 4567	123 Main St	\N	Cape Town	8001	Western Cape	South Africa	999.99	0.00	999.99	unpaid	pending	\N	f	2026-10-21 14:06:41.575866+01	2026-10-21 13:59:02.773413+01	2026-10-21 14:06:41.575866+01	ZAR	1.0000	999.99	\N
30	SO-2026-00030	1	France Witness	alphaman706@gmail.com	+27 82 123 4567	123 Main St	\N	Cape Town	8001	Western Cape	South Africa	999.99	0.00	999.99	unpaid	pending	\N	f	2026-10-21 14:19:09.861128+01	2026-10-21 14:06:59.455643+01	2026-10-21 14:19:09.861128+01	ZAR	1.0000	999.99	\N
21	SO-2026-00021	1	France Witness	alphaman706@gmail.com	0713662410	R538	116	Nelspruit	1240	Mpumalanga	South Africa	30000.00	0.00	30000.00	unpaid	pending	\N	f	2026-10-21 14:19:17.197969+01	2026-10-20 16:40:43.859658+01	2026-10-21 14:19:17.197969+01	ZAR	1.0000	0.00	\N
22	SO-2026-00022	1	France Witness	alphaman706@gmail.com	0713662410	R538	116	Nelspruit	1240	Mpumalanga	South Africa	349.99	0.00	349.99	unpaid	pending	\N	f	2026-10-21 14:19:21.264807+01	2026-10-20 17:35:41.122708+01	2026-10-21 14:19:21.264807+01	ZAR	1.0000	0.00	\N
23	SO-2026-00023	1	Test Recipient	alphaman706@gmail.com	+27 82 123 4567	1 Test St	\N	Cape Town	8001	Western Cape	South Africa	349.99	0.00	349.99	unpaid	pending	\N	f	2026-10-21 14:19:24.495659+01	2026-10-20 17:54:44.222299+01	2026-10-21 14:19:24.495659+01	ZAR	1.0000	0.00	\N
24	SO-2026-00024	1	France Witness	alphaman706@gmail.com	0713662410	R538	116	Nelspruit	1240	Mpumalanga	South Africa	89.95	0.00	89.95	unpaid	pending	\N	f	2026-10-21 14:19:28.153992+01	2026-10-21 07:37:59.015517+01	2026-10-21 14:19:28.153992+01	ZAR	1.0000	0.00	\N
25	SO-2026-00025	1	France Witness	alphaman706@gmail.com	0713662410	R538	116	Nelspruit	1250	Mpumalanga	South Africa	45.99	0.00	45.99	unpaid	pending	\N	f	2026-10-21 14:19:31.790765+01	2026-10-21 08:23:28.488592+01	2026-10-21 14:19:31.790765+01	ZAR	1.0000	0.00	\N
26	SO-2026-00026	1	France Witness	alphaman706@gmail.com	+27 82 123 4567	123 Main St	1240	Cape Town	8001	Western Cape	South Africa	458.91	0.00	458.91	unpaid	pending	\N	f	2026-10-21 14:19:35.826642+01	2026-10-21 10:06:45.834653+01	2026-10-21 14:19:35.826642+01	ZAR	1.0000	0.00	\N
31	SO-2026-00031	1	France Witness	alphaman706@gmail.com	+27 82 123 4567	123 Main St	\N	Cape Town	8001	Western Cape	South Africa	999.99	0.00	999.99	unpaid	pending	\N	f	2026-10-21 14:35:07.978815+01	2026-10-21 14:25:57.227723+01	2026-10-21 14:35:07.978815+01	ZAR	1.0000	999.99	\N
35	SO-2026-00035	1	Test	alphaman706@gmail.com	1234567890	1 St	\N	CT	8001	WC	ZA	999.99	0.00	999.99	unpaid	pending	\N	f	2026-10-21 17:00:18.90092+01	2026-10-21 16:31:53.491442+01	2026-10-21 17:00:18.90092+01	ZAR	1.0000	999.99	2026-10-24 16:31:53.548+01
34	SO-2026-00034	1	France Witness	alphaman706@gmail.com	+27 82 123 4567	123 Main St	\N	Cape Town	8001	Western Cape	South Africa	41.58	0.00	41.58	unpaid	shipped	\N	f	2026-10-21 17:00:20.798824+01	2026-10-21 16:16:04.523591+01	2026-10-21 17:00:20.798824+01	GBP	0.0420	989.94	\N
33	SO-2026-00033	1	France Witness	alphaman706@gmail.com	+27 82 123 4567	123 Main St	\N	Cape Town	8001	Western Cape	South Africa	1.93	0.00	1.93	unpaid	processing	\N	f	2026-10-21 17:00:24.24454+01	2026-10-21 16:14:44.288641+01	2026-10-21 17:00:24.24454+01	GBP	0.0420	45.99	\N
36	SO-2026-00036	1	Test	alphaman706@gmail.com	1234567890	1 St	\N	CT	8001	WC	ZA	999.99	0.00	999.99	unpaid	pending	\N	f	2026-10-21 17:00:15.425789+01	2026-10-21 16:34:37.880333+01	2026-10-21 17:00:15.425789+01	ZAR	1.0000	999.99	2026-10-27 23:59:59+00
32	SO-2026-00032	1	France Witness	alphaman706@gmail.com	+27 82 123 4567	123 Main St	\N	Cape Town	8001	Western Cape	South Africa	42.00	0.00	42.00	unpaid	pending	\N	f	2026-10-21 17:00:26.229167+01	2026-10-21 14:36:06.634758+01	2026-10-21 17:00:26.229167+01	GBP	0.0420	999.99	\N
37	SO-2026-00037	1	France Witness	alphaman706@gmail.com	+27 82 123 4567	123 Main St	\N	Cape Town	8001	Western Cape	South Africa	42.00	0.00	42.00	unpaid	pending	\N	f	2026-10-21 17:08:13.191903+01	2026-10-21 17:01:02.030806+01	2026-10-21 17:08:13.191903+01	GBP	0.0420	999.99	2026-10-24 17:01:02.111+01
38	SO-2026-00038	1	France Witness	alphaman706@gmail.com	+27 82 123 4567	123 Main St	\N	Cape Town	8001	Western Cape	South Africa	42.00	0.00	42.00	unpaid	pending	\N	f	2026-10-21 17:22:19.186736+01	2026-10-21 17:10:35.372975+01	2026-10-21 17:22:19.186736+01	GBP	0.0420	999.99	2026-10-24 17:10:35.434+01
39	SO-2026-00039	1	France Witness	alphaman706@gmail.com	+27 82 123 4567	123 Main St	\N	Cape Town	8001	Western Cape	South Africa	42.00	0.00	42.00	unpaid	pending	\N	f	2026-10-22 11:49:14.128637+01	2026-10-21 17:22:32.539312+01	2026-10-22 11:49:14.128637+01	GBP	0.0420	999.99	2026-10-27 23:59:59+00
40	SO-2026-00040	1	France Witness	alphaman706@gmail.com	+27 82 123 4567	123 Main St	\N	Cape Town	8001	Western Cape	South Africa	42.00	0.00	42.00	unpaid	pending	\N	f	2026-10-22 11:49:10.650226+01	2026-10-21 17:29:40.133617+01	2026-10-22 11:49:10.650226+01	GBP	0.0420	999.99	2026-10-29 23:59:59+00
41	SO-2026-00041	1	France Witness	alphaman706@gmail.com	0767789235	116 R538 White River	Majojos	Nelspruit	1240	Mpumalanga	South Africa	26.50	0.00	26.50	unpaid	pending	\N	f	2026-10-22 11:49:07.554488+01	2026-10-21 18:58:57.542054+01	2026-10-22 11:49:07.554488+01	USD	0.0530	499.99	2026-10-29 23:59:59+00
43	SO-2026-00043	1	France Witness	alphaman706@gmail.com	0767789235	116 R538 White River	Majojos	Nelspruit	1240	Mpumalanga	South Africa	959.99	0.00	959.99	unpaid	pending	\N	f	2026-10-22 11:49:00.365907+01	2026-10-22 11:48:15.626514+01	2026-10-22 11:49:00.365907+01	ZAR	1.0000	959.99	2026-10-29 11:48:15.707+00
42	SO-2026-00042	1	France Witness	alphaman706@gmail.com	0767789235	116 R538 White River	Majojos	Nelspruit	1240	Mpumalanga	South Africa	349.99	0.00	349.99	paid	delivered	2026-10-21 19:06:46.581878+01	f	2026-10-22 11:49:04.279366+01	2026-10-21 19:03:23.499247+01	2026-10-22 11:49:04.279366+01	ZAR	1.0000	349.99	2026-10-25 23:59:59+00
44	SO-2026-00044	1	France Witness	alphaman706@gmail.com	0767789235	116 R538 White River	Majojos	Nelspruit	1240	Mpumalanga	South Africa	876.74	0.00	876.74	unpaid	processing	\N	f	\N	2026-10-22 11:56:49.391288+01	2026-10-22 12:39:25.55032+01	ZAR	1.0000	876.74	2026-10-25 11:56:49.449+00
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: sky_opticles_app
--

COPY public.password_reset_tokens (id, user_id, token, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: prescriptions; Type: TABLE DATA; Schema: public; Owner: sky_opticles_app
--

COPY public.prescriptions (id, user_id, filename, original_name, mime_type, size_bytes, created_at) FROM stdin;
1	1	1792269353895-9351c445c4db28915200e9ebbfc4ec4a.png	_test.png	image/png	70	2026-10-17 21:35:53.930577+01
2	1	1792269427369-79858ebe0ce12cf155a43c638361e22c.png	_test.png	image/png	70	2026-10-17 21:37:07.399393+01
3	1	1792271620510-b1b028f7d1a64df84312040dbe7b7541.pdf	Document%20(9).PDF	application/pdf	41764	2026-10-17 22:13:40.579693+01
4	1	1792404630929-e48c1ed3f7c47ff92d8dcde5c2d06625.pdf	Document%20(9).PDF	application/pdf	41764	2026-10-19 11:10:31.035877+01
5	1	1792414718599-e0b59b06e367b95be7d393a29dc42738.pdf	Document%20(9).PDF	application/pdf	41764	2026-10-19 13:58:38.744122+01
6	1	1792415711831-f5f480f7ff82a0200e3731fea8836c77.pdf	Document%20(9).PDF	application/pdf	41764	2026-10-19 14:15:11.840011+01
7	1	1792425024449-ec83eb52954a76758dcb642e2712c3bd.pdf	Document%20(9).PDF	application/pdf	41764	2026-10-19 16:50:24.488344+01
8	1	1792425105781-8ebd7154ea361db1b1f035308d05b37c.pdf	Document%20(9).PDF	application/pdf	41764	2026-10-19 16:51:45.796469+01
9	1	1792435510557-a515e5b8ed82ef1b08ebcb9b2b372384.pdf	Document%20(9).PDF	application/pdf	41764	2026-10-19 19:45:10.594093+01
10	1	1792521553228-063f1a43cc10d35c4444a1412fa7022a.pdf	Document%20(9).PDF	application/pdf	41764	2026-10-20 19:39:13.270104+01
11	1	1792576330977-3c2b4911987cf2419b2181dd1318afb0.pdf	Document%20(9).PDF	application/pdf	41764	2026-10-21 10:52:11.065826+01
12	1	1792666066767-493d303ae44153afc858ed4b09ecf2ed.pdf	Document%20(9).PDF	application/pdf	41764	2026-10-22 11:47:46.824805+01
\.


--
-- Data for Name: product_3d_models; Type: TABLE DATA; Schema: public; Owner: sky_opticles_app
--

COPY public.product_3d_models (id, product_id, variant_id, model_url, format, poster_url, file_size_bytes, is_primary, created_at) FROM stdin;
2	24	\N	/uploads/models/1792676949599-reading-glasses.glb	glb	\N	132700	t	2026-10-22 14:49:09.760323+01
1	25	\N	/uploads/models/1792674359944-test-astronaut.glb	glb	\N	2869044	f	2026-10-22 14:06:00.366429+01
4	25	\N	/uploads/models/generated-25-1792681630083.glb	glb	\N	4497344	t	2026-10-22 16:07:10.17568+01
7	26	\N	/uploads/models/generated-26-1792695826546.glb	glb	\N	1937136	f	2026-10-22 20:03:46.568046+01
8	26	\N	/uploads/models/generated-26-1792702842774.glb	glb	\N	1368284	t	2026-10-22 22:00:42.825484+01
3	18	\N	/uploads/models/1792677246940-glasses01.glb	glb	\N	437024	f	2026-10-22 14:54:07.316435+01
9	18	\N	/uploads/models/generated-18-1792703157803.glb	glb	\N	1465932	t	2026-10-22 22:05:57.862243+01
\.


--
-- Data for Name: product_currency_prices; Type: TABLE DATA; Schema: public; Owner: sky_opticles_app
--

COPY public.product_currency_prices (id, product_id, currency_code, price) FROM stdin;
\.


--
-- Data for Name: product_images; Type: TABLE DATA; Schema: public; Owner: sky_opticles_app
--

COPY public.product_images (id, product_id, image_url, alt_text, is_primary, sort_order, created_at, variant_id, lens_layer_url) FROM stdin;
19	18	/uploads/products/1792606967930-b0ae8394185ed97eab8f9e4d4a1141fe.jpg	glass5.jpg	t	0	2026-10-21 19:22:47.977652+01	\N	\N
20	19	/uploads/products/1792608851304-855285243a32a4dd594a8da99ac8f78c.jpg	addidas.jpg	t	0	2026-10-21 19:54:11.317943+01	\N	\N
21	20	/uploads/products/1792609046052-7f9b6d4da77431173aa495645a831a6d.jpg	men.jpg	t	0	2026-10-21 19:57:26.087699+01	\N	\N
22	21	/uploads/products/1792609294469-744b83040e68189f59123f2201641e5f.jpg	burger1.jpg	t	0	2026-10-21 20:01:34.494455+01	\N	\N
23	23	/uploads/products/1792609377226-5aae89231096bce49b5ad6dfe02e35e6.jpg	fry1.jpg	t	0	2026-10-21 20:02:57.239477+01	\N	\N
24	22	/uploads/products/1792609407764-710c70ddc4e05985fab91dd888f3517b.jpg	drinks.jpg	t	0	2026-10-21 20:03:27.789311+01	\N	\N
25	24	/uploads/products/1792609679490-8b2945c667f83627cd91fd09ba2ed0be.jpg	cam1.jpg	t	0	2026-10-21 20:07:59.509131+01	\N	\N
26	25	/uploads/products/1792609728922-7884ee52e7b6d24de5a87d6dd76c27a9.jpg	out.jpg	t	0	2026-10-21 20:08:48.933744+01	\N	\N
27	26	/uploads/products/1792695737300-4b68b540086d59524aa662ed302f501c.jpg	glass4.jpg	t	0	2026-10-22 20:02:17.335792+01	\N	\N
\.


--
-- Data for Name: product_types; Type: TABLE DATA; Schema: public; Owner: sky_opticles_app
--

COPY public.product_types (id, key, label, default_has_configurator, sort_order, created_at) FROM stdin;
17	optics	Optics	f	1	2026-10-21 19:19:12.035752+01
\.


--
-- Data for Name: product_variants; Type: TABLE DATA; Schema: public; Owner: sky_opticles_app
--

COPY public.product_variants (id, product_id, sku, color, frame_material, frame_shape, size_label, price_override, stock_quantity, reorder_level, is_active, created_at, color_hex, attributes) FROM stdin;
12	23	Fries Specs	\N	\N	\N	\N	\N	0	1	t	2026-10-22 11:51:32.986382+01	\N	{"Kg": "1kg", "Pepper": "Paprika peppe", "Source": "Tomato Source", "Viniger": "General Viniger"}
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: sky_opticles_app
--

COPY public.products (id, category_id, brand_id, name, slug, description, product_type, price, status, created_at, updated_at, has_configurator, condition, base_currency) FROM stdin;
19	29	5	Argentina T-Shirt	argentina-t-shirt	hgsedfusegy8siudgybuyszgdbfudys	optics	899.09	active	2026-10-21 19:53:59.027+01	2026-10-21 19:54:17.670923+01	f	new	ZAR
20	31	\N	Deck Men's Jean	deck-men-s-jean	rwedtcygubhjnokp,kmojihugyftdrsaezsrxdtcfyvgubhinjomk[jpihguyftdrs	optics	799.00	active	2026-10-21 19:57:14.302584+01	2026-10-21 19:57:56.536263+01	f	new	ZAR
21	37	2	London's Burger	london-s-burger	guvwfbhikl;,f'gkfejihugvbd,samkljihbskdfgbjovfihnv,erofsuetgdbinoldsrkvgn	optics	55.83	active	2026-10-21 20:01:21.990672+01	2026-10-21 20:01:37.330175+01	f	new	ZAR
23	39	\N	Fries	fries	rdtfygvubhugfydtrszdxthfcyguhbyjrtuvh	optics	76.88	active	2026-10-21 20:02:47.094414+01	2026-10-21 20:02:59.680243+01	f	new	ZAR
22	38	\N	London Dry Gin	london-dry-gin	srzdxtcfyvgubhinjoihgfydtrsztxyckuvlib;on'pmioiylvutkcyrjxtercyfklhbi	optics	45.00	active	2026-10-21 20:02:15.594435+01	2026-10-21 20:03:29.913378+01	f	new	ZAR
24	41	\N	Watcher101	watcher101	rsdtfgyhujbgvyfctdrxszeasdfxcg vjhcgfdxfg hb	optics	799.86	active	2026-10-21 20:06:35.168196+01	2026-10-21 20:08:05.226668+01	f	new	ZAR
25	42	\N	Awl!01	awl-01	etdrfcyvguhjnhbguyftdrsedfguyhitrde5s4we5drtyu	optics	998.82	active	2026-10-21 20:07:42.453339+01	2026-10-21 20:08:51.581863+01	f	used	ZAR
18	16	\N	Aviator Glasses	aviator-glasses	Buy This glamourous optical glasses to see your world clearly	optics	99.99	active	2026-10-21 19:22:20.197419+01	2026-10-22 11:41:48.809114+01	t	new	ZAR
26	18	2	ClearView	clearview	Mobile shows gray glasses + admin button works	optics	777.69	active	2026-10-22 20:00:25.410293+01	2026-10-22 20:02:21.456743+01	t	new	ZAR
\.


--
-- Data for Name: user_addresses; Type: TABLE DATA; Schema: public; Owner: sky_opticles_app
--

COPY public.user_addresses (id, user_id, label, recipient_name, phone, line1, line2, city, postal_code, province, country, is_default, created_at, updated_at) FROM stdin;
1	1	Home	France Witness	0767789235	116 R538 White River 	Majojos	Nelspruit 	1240	Mpumalanga 	South Africa	t	2026-10-20 16:48:49.78081+01	2026-10-21 18:59:42.128949+01
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: sky_opticles_app
--

COPY public.users (id, name, email, password_hash, created_at, updated_at, phone, expo_push_token) FROM stdin;
1	France Witness	alphaman706@gmail.com	$2b$10$.CYf509PfE3vuGBNoqO2ceTyLZTH1CNF.8oJKF9MXRp48CSEmww8y	2026-10-17 18:44:12.555061+01	2026-10-19 10:37:50.368716+01	0713662410	\N
\.


--
-- Name: admins_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sky_opticles_app
--

SELECT pg_catalog.setval('public.admins_id_seq', 1, true);


--
-- Name: brands_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sky_opticles_app
--

SELECT pg_catalog.setval('public.brands_id_seq', 5, true);


--
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sky_opticles_app
--

SELECT pg_catalog.setval('public.categories_id_seq', 43, true);


--
-- Name: exchange_rates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sky_opticles_app
--

SELECT pg_catalog.setval('public.exchange_rates_id_seq', 2, true);


--
-- Name: lens_option_groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sky_opticles_app
--

SELECT pg_catalog.setval('public.lens_option_groups_id_seq', 10, true);


--
-- Name: lens_options_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sky_opticles_app
--

SELECT pg_catalog.setval('public.lens_options_id_seq', 40, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sky_opticles_app
--

SELECT pg_catalog.setval('public.notifications_id_seq', 44, true);


--
-- Name: order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sky_opticles_app
--

SELECT pg_catalog.setval('public.order_items_id_seq', 47, true);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sky_opticles_app
--

SELECT pg_catalog.setval('public.orders_id_seq', 44, true);


--
-- Name: orders_number_seq; Type: SEQUENCE SET; Schema: public; Owner: sky_opticles_app
--

SELECT pg_catalog.setval('public.orders_number_seq', 44, true);


--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sky_opticles_app
--

SELECT pg_catalog.setval('public.password_reset_tokens_id_seq', 2, true);


--
-- Name: prescriptions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sky_opticles_app
--

SELECT pg_catalog.setval('public.prescriptions_id_seq', 12, true);


--
-- Name: product_3d_models_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sky_opticles_app
--

SELECT pg_catalog.setval('public.product_3d_models_id_seq', 9, true);


--
-- Name: product_currency_prices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sky_opticles_app
--

SELECT pg_catalog.setval('public.product_currency_prices_id_seq', 1, false);


--
-- Name: product_images_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sky_opticles_app
--

SELECT pg_catalog.setval('public.product_images_id_seq', 27, true);


--
-- Name: product_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sky_opticles_app
--

SELECT pg_catalog.setval('public.product_types_id_seq', 18, true);


--
-- Name: product_variants_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sky_opticles_app
--

SELECT pg_catalog.setval('public.product_variants_id_seq', 12, true);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sky_opticles_app
--

SELECT pg_catalog.setval('public.products_id_seq', 26, true);


--
-- Name: user_addresses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sky_opticles_app
--

SELECT pg_catalog.setval('public.user_addresses_id_seq', 1, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sky_opticles_app
--

SELECT pg_catalog.setval('public.users_id_seq', 1, true);


--
-- Name: admins admins_pkey; Type: CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_pkey PRIMARY KEY (id);


--
-- Name: brands brands_name_key; Type: CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_name_key UNIQUE (name);


--
-- Name: brands brands_pkey; Type: CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_pkey PRIMARY KEY (id);


--
-- Name: brands brands_slug_key; Type: CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_slug_key UNIQUE (slug);


--
-- Name: categories categories_name_key; Type: CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_key UNIQUE (name);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- Name: exchange_rates exchange_rates_currency_code_key; Type: CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT exchange_rates_currency_code_key UNIQUE (currency_code);


--
-- Name: exchange_rates exchange_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT exchange_rates_pkey PRIMARY KEY (id);


--
-- Name: lens_option_groups lens_option_groups_group_key_key; Type: CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.lens_option_groups
    ADD CONSTRAINT lens_option_groups_group_key_key UNIQUE (group_key);


--
-- Name: lens_option_groups lens_option_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.lens_option_groups
    ADD CONSTRAINT lens_option_groups_pkey PRIMARY KEY (id);


--
-- Name: lens_options lens_options_group_id_option_key_key; Type: CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.lens_options
    ADD CONSTRAINT lens_options_group_id_option_key_key UNIQUE (group_id, option_key);


--
-- Name: lens_options lens_options_pkey; Type: CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.lens_options
    ADD CONSTRAINT lens_options_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: prescriptions prescriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_pkey PRIMARY KEY (id);


--
-- Name: product_3d_models product_3d_models_pkey; Type: CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.product_3d_models
    ADD CONSTRAINT product_3d_models_pkey PRIMARY KEY (id);


--
-- Name: product_currency_prices product_currency_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.product_currency_prices
    ADD CONSTRAINT product_currency_prices_pkey PRIMARY KEY (id);


--
-- Name: product_currency_prices product_currency_prices_product_id_currency_code_key; Type: CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.product_currency_prices
    ADD CONSTRAINT product_currency_prices_product_id_currency_code_key UNIQUE (product_id, currency_code);


--
-- Name: product_images product_images_pkey; Type: CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_pkey PRIMARY KEY (id);


--
-- Name: product_types product_types_key_key; Type: CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.product_types
    ADD CONSTRAINT product_types_key_key UNIQUE (key);


--
-- Name: product_types product_types_pkey; Type: CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.product_types
    ADD CONSTRAINT product_types_pkey PRIMARY KEY (id);


--
-- Name: product_variants product_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_pkey PRIMARY KEY (id);


--
-- Name: product_variants product_variants_sku_key; Type: CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_sku_key UNIQUE (sku);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_slug_key; Type: CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_slug_key UNIQUE (slug);


--
-- Name: user_addresses user_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.user_addresses
    ADD CONSTRAINT user_addresses_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: admins_email_lower_idx; Type: INDEX; Schema: public; Owner: sky_opticles_app
--

CREATE UNIQUE INDEX admins_email_lower_idx ON public.admins USING btree (lower((email)::text));


--
-- Name: idx_3d_models_product; Type: INDEX; Schema: public; Owner: sky_opticles_app
--

CREATE INDEX idx_3d_models_product ON public.product_3d_models USING btree (product_id);


--
-- Name: idx_categories_parent; Type: INDEX; Schema: public; Owner: sky_opticles_app
--

CREATE INDEX idx_categories_parent ON public.categories USING btree (parent_id);


--
-- Name: idx_images_product; Type: INDEX; Schema: public; Owner: sky_opticles_app
--

CREATE INDEX idx_images_product ON public.product_images USING btree (product_id);


--
-- Name: idx_images_variant; Type: INDEX; Schema: public; Owner: sky_opticles_app
--

CREATE INDEX idx_images_variant ON public.product_images USING btree (variant_id);


--
-- Name: idx_lens_options_group; Type: INDEX; Schema: public; Owner: sky_opticles_app
--

CREATE INDEX idx_lens_options_group ON public.lens_options USING btree (group_id);


--
-- Name: idx_notifications_admin; Type: INDEX; Schema: public; Owner: sky_opticles_app
--

CREATE INDEX idx_notifications_admin ON public.notifications USING btree (admin_id, created_at DESC) WHERE (admin_id IS NOT NULL);


--
-- Name: idx_notifications_customer; Type: INDEX; Schema: public; Owner: sky_opticles_app
--

CREATE INDEX idx_notifications_customer ON public.notifications USING btree (customer_id, created_at DESC) WHERE (customer_id IS NOT NULL);


--
-- Name: idx_order_items_order; Type: INDEX; Schema: public; Owner: sky_opticles_app
--

CREATE INDEX idx_order_items_order ON public.order_items USING btree (order_id);


--
-- Name: idx_order_items_product; Type: INDEX; Schema: public; Owner: sky_opticles_app
--

CREATE INDEX idx_order_items_product ON public.order_items USING btree (product_id);


--
-- Name: idx_orders_created; Type: INDEX; Schema: public; Owner: sky_opticles_app
--

CREATE INDEX idx_orders_created ON public.orders USING btree (created_at DESC);


--
-- Name: idx_orders_fulfillment_status; Type: INDEX; Schema: public; Owner: sky_opticles_app
--

CREATE INDEX idx_orders_fulfillment_status ON public.orders USING btree (fulfillment_status);


--
-- Name: idx_orders_live; Type: INDEX; Schema: public; Owner: sky_opticles_app
--

CREATE INDEX idx_orders_live ON public.orders USING btree (created_at DESC) WHERE (deleted_at IS NULL);


--
-- Name: idx_orders_payment_status; Type: INDEX; Schema: public; Owner: sky_opticles_app
--

CREATE INDEX idx_orders_payment_status ON public.orders USING btree (payment_status);


--
-- Name: idx_orders_user_created; Type: INDEX; Schema: public; Owner: sky_opticles_app
--

CREATE INDEX idx_orders_user_created ON public.orders USING btree (user_id, created_at DESC);


--
-- Name: idx_password_resets_token; Type: INDEX; Schema: public; Owner: sky_opticles_app
--

CREATE INDEX idx_password_resets_token ON public.password_reset_tokens USING btree (token);


--
-- Name: idx_prescriptions_user; Type: INDEX; Schema: public; Owner: sky_opticles_app
--

CREATE INDEX idx_prescriptions_user ON public.prescriptions USING btree (user_id);


--
-- Name: idx_products_brand; Type: INDEX; Schema: public; Owner: sky_opticles_app
--

CREATE INDEX idx_products_brand ON public.products USING btree (brand_id);


--
-- Name: idx_products_category; Type: INDEX; Schema: public; Owner: sky_opticles_app
--

CREATE INDEX idx_products_category ON public.products USING btree (category_id);


--
-- Name: idx_products_status; Type: INDEX; Schema: public; Owner: sky_opticles_app
--

CREATE INDEX idx_products_status ON public.products USING btree (status);


--
-- Name: idx_user_addresses_user; Type: INDEX; Schema: public; Owner: sky_opticles_app
--

CREATE INDEX idx_user_addresses_user ON public.user_addresses USING btree (user_id);


--
-- Name: idx_variants_product; Type: INDEX; Schema: public; Owner: sky_opticles_app
--

CREATE INDEX idx_variants_product ON public.product_variants USING btree (product_id);


--
-- Name: idx_variants_stock; Type: INDEX; Schema: public; Owner: sky_opticles_app
--

CREATE INDEX idx_variants_stock ON public.product_variants USING btree (stock_quantity);


--
-- Name: one_primary_3d_model_per_scope; Type: INDEX; Schema: public; Owner: sky_opticles_app
--

CREATE UNIQUE INDEX one_primary_3d_model_per_scope ON public.product_3d_models USING btree (product_id, COALESCE(variant_id, (0)::bigint)) WHERE (is_primary = true);


--
-- Name: one_primary_image_per_product; Type: INDEX; Schema: public; Owner: sky_opticles_app
--

CREATE UNIQUE INDEX one_primary_image_per_product ON public.product_images USING btree (product_id) WHERE (is_primary = true);


--
-- Name: user_addresses_default_idx; Type: INDEX; Schema: public; Owner: sky_opticles_app
--

CREATE UNIQUE INDEX user_addresses_default_idx ON public.user_addresses USING btree (user_id) WHERE (is_default = true);


--
-- Name: users_email_lower_idx; Type: INDEX; Schema: public; Owner: sky_opticles_app
--

CREATE UNIQUE INDEX users_email_lower_idx ON public.users USING btree (lower((email)::text));


--
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: lens_options lens_options_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.lens_options
    ADD CONSTRAINT lens_options_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.lens_option_groups(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admins(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_prescription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_prescription_id_fkey FOREIGN KEY (prescription_id) REFERENCES public.prescriptions(id) ON DELETE SET NULL;


--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: order_items order_items_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE SET NULL;


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: prescriptions prescriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: product_3d_models product_3d_models_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.product_3d_models
    ADD CONSTRAINT product_3d_models_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_3d_models product_3d_models_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.product_3d_models
    ADD CONSTRAINT product_3d_models_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;


--
-- Name: product_currency_prices product_currency_prices_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.product_currency_prices
    ADD CONSTRAINT product_currency_prices_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_images product_images_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_images product_images_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE SET NULL;


--
-- Name: product_variants product_variants_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: products products_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON DELETE RESTRICT;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE RESTRICT;


--
-- Name: user_addresses user_addresses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sky_opticles_app
--

ALTER TABLE ONLY public.user_addresses
    ADD CONSTRAINT user_addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--sellerpass123 for seller-1266779242@example.com--





--

\unrestrict MJX2S7hZiPITNwLfv3JLmckm4cHqechbzFHNywLoTcZo1NehgACkRlNiKcavGUw

