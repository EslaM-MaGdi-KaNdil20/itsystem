--
-- PostgreSQL database dump
--

\restrict 0ARrSTQc3V1OYT2ixLrKsvkgElWuEhtIiHQoiReYO7kcU2DIpbKajLPPlOVUKTw

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

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
-- Name: accessories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.accessories (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    name_ar character varying(100),
    category character varying(50) DEFAULT 'general'::character varying,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    stock_quantity integer DEFAULT 0,
    min_stock_level integer DEFAULT 5,
    unit_price numeric(10,2) DEFAULT 0,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.accessories OWNER TO postgres;

--
-- Name: accessories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.accessories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.accessories_id_seq OWNER TO postgres;

--
-- Name: accessories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.accessories_id_seq OWNED BY public.accessories.id;


--
-- Name: accessory_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.accessory_assignments (
    id integer NOT NULL,
    accessory_id integer,
    employee_id integer,
    quantity integer DEFAULT 1,
    serial_number character varying(100),
    condition character varying(50) DEFAULT 'new'::character varying,
    assigned_by character varying(255),
    assigned_date date DEFAULT CURRENT_DATE,
    notes text,
    is_returned boolean DEFAULT false,
    returned_date date,
    returned_condition character varying(50),
    return_notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.accessory_assignments OWNER TO postgres;

--
-- Name: accessory_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.accessory_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.accessory_assignments_id_seq OWNER TO postgres;

--
-- Name: accessory_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.accessory_assignments_id_seq OWNED BY public.accessory_assignments.id;


--
-- Name: accessory_stock_movements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.accessory_stock_movements (
    id integer NOT NULL,
    accessory_id integer,
    movement_type character varying(20) NOT NULL,
    quantity integer NOT NULL,
    reference_type character varying(50),
    reference_id integer,
    notes text,
    created_by character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT movement_type_check CHECK (((movement_type)::text = ANY (ARRAY[('in'::character varying)::text, ('out'::character varying)::text, ('adjustment'::character varying)::text, ('return'::character varying)::text])))
);


ALTER TABLE public.accessory_stock_movements OWNER TO postgres;

--
-- Name: accessory_stock_movements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.accessory_stock_movements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.accessory_stock_movements_id_seq OWNER TO postgres;

--
-- Name: accessory_stock_movements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.accessory_stock_movements_id_seq OWNED BY public.accessory_stock_movements.id;


--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activity_logs (
    id integer NOT NULL,
    user_id integer,
    user_name character varying(255),
    action character varying(50) NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id integer,
    entity_name character varying(255),
    details text,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.activity_logs OWNER TO postgres;

--
-- Name: activity_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.activity_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.activity_logs_id_seq OWNER TO postgres;

--
-- Name: activity_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.activity_logs_id_seq OWNED BY public.activity_logs.id;


--
-- Name: ad_computers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ad_computers (
    id integer NOT NULL,
    computer_name character varying(255) NOT NULL,
    assigned_employee_id integer,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.ad_computers OWNER TO postgres;

--
-- Name: ad_computers_cache; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ad_computers_cache (
    id integer NOT NULL,
    computer_name character varying(255) NOT NULL,
    dns_name character varying(255),
    os character varying(255),
    os_version character varying(100),
    os_sp character varying(100),
    computer_type character varying(50),
    ou character varying(500),
    dn text,
    description text,
    location character varying(255),
    last_logon timestamp without time zone,
    is_active boolean DEFAULT false,
    created_at_ad timestamp without time zone,
    last_changed timestamp without time zone,
    is_enabled boolean DEFAULT true,
    managed_by_name character varying(255),
    managed_by_username character varying(255),
    managed_by_department character varying(255),
    managed_by_email character varying(255),
    synced_at timestamp without time zone DEFAULT now(),
    processor character varying(255),
    ram_gb numeric(10,2),
    disk_size_gb numeric(10,2),
    disk_free_gb numeric(10,2),
    manufacturer character varying(255),
    model character varying(255),
    serial_number character varying(255),
    ip_address character varying(50),
    mac_address character varying(50),
    specs_updated_at timestamp without time zone,
    disks jsonb
);


ALTER TABLE public.ad_computers_cache OWNER TO postgres;

--
-- Name: ad_computers_cache_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ad_computers_cache_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ad_computers_cache_id_seq OWNER TO postgres;

--
-- Name: ad_computers_cache_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ad_computers_cache_id_seq OWNED BY public.ad_computers_cache.id;


--
-- Name: ad_computers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ad_computers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ad_computers_id_seq OWNER TO postgres;

--
-- Name: ad_computers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ad_computers_id_seq OWNED BY public.ad_computers.id;


--
-- Name: ad_config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ad_config (
    id integer NOT NULL,
    domain_name character varying(255) NOT NULL,
    server_url character varying(500) NOT NULL,
    base_dn character varying(500) NOT NULL,
    bind_dn character varying(500) NOT NULL,
    bind_password text NOT NULL,
    search_filter character varying(500) DEFAULT '(&(objectClass=user)(objectCategory=person))'::character varying,
    use_ssl boolean DEFAULT false,
    port integer DEFAULT 389,
    sync_interval_minutes integer DEFAULT 60,
    auto_sync_enabled boolean DEFAULT false,
    auto_create_users boolean DEFAULT false,
    default_role character varying(50) DEFAULT 'user'::character varying,
    sync_employees boolean DEFAULT true,
    last_sync_at timestamp without time zone,
    last_sync_status character varying(50),
    last_sync_message text,
    last_sync_count integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.ad_config OWNER TO postgres;

--
-- Name: ad_config_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ad_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ad_config_id_seq OWNER TO postgres;

--
-- Name: ad_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ad_config_id_seq OWNED BY public.ad_config.id;


--
-- Name: ad_groups_ous; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ad_groups_ous (
    id integer NOT NULL,
    ad_guid character varying(255),
    name character varying(255) NOT NULL,
    display_name character varying(255),
    distinguished_name character varying(500),
    description text,
    type character varying(50) NOT NULL,
    member_count integer DEFAULT 0,
    parent_dn character varying(500),
    local_department_id integer,
    is_synced boolean DEFAULT false,
    last_sync_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.ad_groups_ous OWNER TO postgres;

--
-- Name: ad_groups_ous_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ad_groups_ous_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ad_groups_ous_id_seq OWNER TO postgres;

--
-- Name: ad_groups_ous_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ad_groups_ous_id_seq OWNED BY public.ad_groups_ous.id;


--
-- Name: ad_sync_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ad_sync_logs (
    id integer NOT NULL,
    sync_type character varying(50) NOT NULL,
    status character varying(50) NOT NULL,
    total_found integer DEFAULT 0,
    new_imported integer DEFAULT 0,
    updated integer DEFAULT 0,
    errors integer DEFAULT 0,
    error_details text,
    duration_ms integer,
    triggered_by character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.ad_sync_logs OWNER TO postgres;

--
-- Name: ad_sync_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ad_sync_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ad_sync_logs_id_seq OWNER TO postgres;

--
-- Name: ad_sync_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ad_sync_logs_id_seq OWNED BY public.ad_sync_logs.id;


--
-- Name: ad_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ad_users (
    id integer NOT NULL,
    ad_guid character varying(255),
    sam_account_name character varying(255),
    user_principal_name character varying(500),
    display_name character varying(255),
    first_name character varying(255),
    last_name character varying(255),
    email character varying(255),
    phone character varying(100),
    mobile character varying(100),
    title character varying(255),
    department character varying(255),
    company character varying(255),
    office character varying(255),
    manager_dn character varying(500),
    distinguished_name character varying(500),
    member_of text,
    is_enabled boolean DEFAULT true,
    when_created timestamp without time zone,
    when_changed timestamp without time zone,
    last_logon timestamp without time zone,
    local_user_id integer,
    local_employee_id integer,
    is_synced_user boolean DEFAULT false,
    is_synced_employee boolean DEFAULT false,
    last_sync_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.ad_users OWNER TO postgres;

--
-- Name: ad_users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ad_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ad_users_id_seq OWNER TO postgres;

--
-- Name: ad_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ad_users_id_seq OWNED BY public.ad_users.id;


--
-- Name: agent_keys; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.agent_keys (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    key_hash character varying(64) NOT NULL,
    key_preview character varying(12) NOT NULL,
    created_by integer,
    last_used timestamp without time zone,
    use_count integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.agent_keys OWNER TO postgres;

--
-- Name: agent_keys_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.agent_keys_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.agent_keys_id_seq OWNER TO postgres;

--
-- Name: agent_keys_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.agent_keys_id_seq OWNED BY public.agent_keys.id;


--
-- Name: assignment_accessories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assignment_accessories (
    id integer NOT NULL,
    assignment_id integer,
    accessory_id integer,
    quantity integer DEFAULT 1,
    serial_number character varying(100),
    condition character varying(50) DEFAULT 'good'::character varying,
    notes text,
    returned boolean DEFAULT false,
    returned_date timestamp without time zone,
    returned_condition character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.assignment_accessories OWNER TO postgres;

--
-- Name: assignment_accessories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.assignment_accessories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.assignment_accessories_id_seq OWNER TO postgres;

--
-- Name: assignment_accessories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.assignment_accessories_id_seq OWNED BY public.assignment_accessories.id;


--
-- Name: attendance_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attendance_records (
    id integer NOT NULL,
    device_id integer,
    zk_user_id character varying(50) NOT NULL,
    employee_id integer,
    "timestamp" timestamp without time zone NOT NULL,
    punch_type integer DEFAULT 0,
    status integer DEFAULT 0,
    synced_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.attendance_records OWNER TO postgres;

--
-- Name: attendance_records_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.attendance_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.attendance_records_id_seq OWNER TO postgres;

--
-- Name: attendance_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.attendance_records_id_seq OWNED BY public.attendance_records.id;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categories_id_seq OWNER TO postgres;

--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: departments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.departments (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(50),
    location character varying(255),
    manager_name character varying(255),
    phone character varying(50),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ad_ou character varying(500),
    ad_dn character varying(500),
    ad_type character varying(50) DEFAULT 'ou'::character varying,
    is_ad_department boolean DEFAULT false
);


ALTER TABLE public.departments OWNER TO postgres;

--
-- Name: departments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.departments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.departments_id_seq OWNER TO postgres;

--
-- Name: departments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.departments_id_seq OWNED BY public.departments.id;


--
-- Name: device_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.device_assignments (
    id integer NOT NULL,
    device_id integer,
    employee_id integer,
    assigned_date date DEFAULT CURRENT_DATE,
    returned_date date,
    windows_username character varying(100),
    windows_password character varying(255),
    email_account character varying(255),
    email_password character varying(255),
    assigned_by character varying(255),
    notes text,
    is_current boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.device_assignments OWNER TO postgres;

--
-- Name: device_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.device_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.device_assignments_id_seq OWNER TO postgres;

--
-- Name: device_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.device_assignments_id_seq OWNED BY public.device_assignments.id;


--
-- Name: device_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.device_types (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    name_ar character varying(100),
    icon character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.device_types OWNER TO postgres;

--
-- Name: device_types_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.device_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.device_types_id_seq OWNER TO postgres;

--
-- Name: device_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.device_types_id_seq OWNED BY public.device_types.id;


--
-- Name: devices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.devices (
    id integer NOT NULL,
    device_type_id integer,
    asset_tag character varying(100),
    brand character varying(100),
    model character varying(100),
    serial_number character varying(255),
    cpu character varying(100),
    ram character varying(50),
    storage character varying(100),
    os character varying(100),
    ip_address character varying(50),
    mac_address character varying(50),
    purchase_date date,
    warranty_end date,
    purchase_price numeric(10,2),
    supplier character varying(255),
    status character varying(50) DEFAULT 'available'::character varying,
    condition character varying(50) DEFAULT 'good'::character varying,
    location character varying(255),
    notes text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT status_check CHECK (((status)::text = ANY (ARRAY[('available'::character varying)::text, ('assigned'::character varying)::text, ('maintenance'::character varying)::text, ('retired'::character varying)::text, ('disposed'::character varying)::text])))
);


ALTER TABLE public.devices OWNER TO postgres;

--
-- Name: devices_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.devices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.devices_id_seq OWNER TO postgres;

--
-- Name: devices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.devices_id_seq OWNED BY public.devices.id;


--
-- Name: email_accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.email_accounts (
    id integer NOT NULL,
    email_address character varying(255) NOT NULL,
    employee_id integer,
    email_type character varying(50) DEFAULT 'work'::character varying,
    password_encrypted text,
    server_incoming character varying(255),
    server_outgoing character varying(255),
    quota_mb integer,
    quota_used_mb integer DEFAULT 0,
    notes text,
    status character varying(50) DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    source character varying(50) DEFAULT 'manual'::character varying,
    domain character varying(255),
    disk_used_mb numeric(10,2) DEFAULT 0,
    last_synced_at timestamp without time zone,
    cpanel_user character varying(255)
);


ALTER TABLE public.email_accounts OWNER TO postgres;

--
-- Name: email_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.email_accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.email_accounts_id_seq OWNER TO postgres;

--
-- Name: email_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.email_accounts_id_seq OWNED BY public.email_accounts.id;


--
-- Name: email_broadcasts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.email_broadcasts (
    id integer NOT NULL,
    subject character varying(500) NOT NULL,
    body text NOT NULL,
    template character varying(50) DEFAULT 'general'::character varying,
    recipients_filter jsonb DEFAULT '{}'::jsonb,
    recipients_count integer DEFAULT 0,
    sent_by character varying(255),
    status character varying(20) DEFAULT 'sent'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.email_broadcasts OWNER TO postgres;

--
-- Name: email_broadcasts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.email_broadcasts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.email_broadcasts_id_seq OWNER TO postgres;

--
-- Name: email_broadcasts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.email_broadcasts_id_seq OWNED BY public.email_broadcasts.id;


--
-- Name: employees; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employees (
    id integer NOT NULL,
    employee_code character varying(50),
    full_name character varying(255) NOT NULL,
    department_id integer,
    job_title character varying(255),
    email character varying(255),
    phone character varying(50),
    extension character varying(20),
    hire_date date,
    is_active boolean DEFAULT true NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ad_guid character varying(255),
    is_ad_employee boolean DEFAULT false
);


ALTER TABLE public.employees OWNER TO postgres;

--
-- Name: employees_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.employees_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.employees_id_seq OWNER TO postgres;

--
-- Name: employees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.employees_id_seq OWNED BY public.employees.id;


--
-- Name: guide_steps; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.guide_steps (
    id integer NOT NULL,
    guide_id integer,
    step_number integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    image_path character varying(500),
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.guide_steps OWNER TO postgres;

--
-- Name: guide_steps_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.guide_steps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.guide_steps_id_seq OWNER TO postgres;

--
-- Name: guide_steps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.guide_steps_id_seq OWNED BY public.guide_steps.id;


--
-- Name: hosting_config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.hosting_config (
    id integer NOT NULL,
    server_url character varying(500) DEFAULT ''::character varying NOT NULL,
    port integer DEFAULT 2087,
    username character varying(255) DEFAULT ''::character varying NOT NULL,
    api_token text DEFAULT ''::text NOT NULL,
    cpanel_user character varying(255) DEFAULT ''::character varying,
    domain character varying(255) DEFAULT ''::character varying NOT NULL,
    use_ssl boolean DEFAULT true,
    auto_sync_enabled boolean DEFAULT false,
    sync_interval_minutes integer DEFAULT 60,
    last_sync_at timestamp without time zone,
    last_sync_status character varying(50),
    last_sync_message text,
    last_sync_count integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    alert_threshold_percent integer DEFAULT 85,
    alert_email character varying(500) DEFAULT ''::character varying,
    alert_enabled boolean DEFAULT true
);


ALTER TABLE public.hosting_config OWNER TO postgres;

--
-- Name: hosting_config_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.hosting_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.hosting_config_id_seq OWNER TO postgres;

--
-- Name: hosting_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.hosting_config_id_seq OWNED BY public.hosting_config.id;


--
-- Name: hosting_sync_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.hosting_sync_logs (
    id integer NOT NULL,
    sync_type character varying(50) DEFAULT 'emails'::character varying,
    total_found integer DEFAULT 0,
    new_count integer DEFAULT 0,
    updated_count integer DEFAULT 0,
    error_count integer DEFAULT 0,
    status character varying(50),
    message text,
    details jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.hosting_sync_logs OWNER TO postgres;

--
-- Name: hosting_sync_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.hosting_sync_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.hosting_sync_logs_id_seq OWNER TO postgres;

--
-- Name: hosting_sync_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.hosting_sync_logs_id_seq OWNED BY public.hosting_sync_logs.id;


--
-- Name: it_access_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.it_access_logs (
    id integer NOT NULL,
    user_id integer,
    action_type character varying(100),
    resource_type character varying(100),
    resource_id integer,
    details text,
    ip_address character varying(45),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.it_access_logs OWNER TO postgres;

--
-- Name: it_access_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.it_access_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.it_access_logs_id_seq OWNER TO postgres;

--
-- Name: it_access_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.it_access_logs_id_seq OWNED BY public.it_access_logs.id;


--
-- Name: license_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.license_assignments (
    id integer NOT NULL,
    license_id integer NOT NULL,
    device_id integer,
    employee_id integer,
    license_key text,
    assigned_date date DEFAULT CURRENT_DATE,
    returned_date date,
    is_current boolean DEFAULT true,
    assigned_by character varying(255),
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.license_assignments OWNER TO postgres;

--
-- Name: license_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.license_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.license_assignments_id_seq OWNER TO postgres;

--
-- Name: license_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.license_assignments_id_seq OWNED BY public.license_assignments.id;


--
-- Name: licenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.licenses (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    vendor character varying(100) NOT NULL,
    version character varying(100),
    type character varying(50) DEFAULT 'software'::character varying NOT NULL,
    key_type character varying(50) DEFAULT 'volume'::character varying,
    license_key text,
    total_quantity integer DEFAULT 1 NOT NULL,
    purchase_date date,
    expiry_date date,
    cost_per_unit numeric(10,2),
    currency character varying(10) DEFAULT 'EGP'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT key_type_check CHECK (((key_type)::text = ANY (ARRAY[('oem'::character varying)::text, ('volume'::character varying)::text, ('subscription'::character varying)::text, ('perpetual'::character varying)::text]))),
    CONSTRAINT license_type_check CHECK (((type)::text = ANY (ARRAY[('windows'::character varying)::text, ('office'::character varying)::text, ('server'::character varying)::text, ('antivirus'::character varying)::text, ('cad'::character varying)::text, ('erp'::character varying)::text, ('other'::character varying)::text])))
);


ALTER TABLE public.licenses OWNER TO postgres;

--
-- Name: licenses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.licenses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.licenses_id_seq OWNER TO postgres;

--
-- Name: licenses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.licenses_id_seq OWNED BY public.licenses.id;


--
-- Name: maintenance_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.maintenance_records (
    id integer NOT NULL,
    device_id integer,
    maintenance_type character varying(100),
    description text,
    start_date date DEFAULT CURRENT_DATE,
    end_date date,
    performed_by character varying(255),
    cost numeric(10,2),
    status character varying(50) DEFAULT 'pending'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT maintenance_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('in_progress'::character varying)::text, ('completed'::character varying)::text, ('cancelled'::character varying)::text])))
);


ALTER TABLE public.maintenance_records OWNER TO postgres;

--
-- Name: maintenance_records_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.maintenance_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.maintenance_records_id_seq OWNER TO postgres;

--
-- Name: maintenance_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.maintenance_records_id_seq OWNED BY public.maintenance_records.id;


--
-- Name: maintenance_schedules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.maintenance_schedules (
    id integer NOT NULL,
    device_id integer,
    title character varying(255) NOT NULL,
    description text,
    interval_days integer DEFAULT 90 NOT NULL,
    last_done date,
    next_due date NOT NULL,
    assigned_to integer,
    is_active boolean DEFAULT true,
    auto_create_task boolean DEFAULT true,
    notify_days_before integer DEFAULT 7,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_task_created_for date
);


ALTER TABLE public.maintenance_schedules OWNER TO postgres;

--
-- Name: maintenance_schedules_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.maintenance_schedules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.maintenance_schedules_id_seq OWNER TO postgres;

--
-- Name: maintenance_schedules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.maintenance_schedules_id_seq OWNED BY public.maintenance_schedules.id;


--
-- Name: network_ips; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.network_ips (
    id integer NOT NULL,
    ip_address character varying(45) NOT NULL,
    subnet_mask character varying(45),
    gateway character varying(45),
    vlan character varying(50),
    mac_address character varying(17),
    device_type character varying(100),
    assigned_to character varying(255),
    location character varying(255),
    notes text,
    status character varying(50) DEFAULT 'available'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.network_ips OWNER TO postgres;

--
-- Name: network_ips_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.network_ips_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.network_ips_id_seq OWNER TO postgres;

--
-- Name: network_ips_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.network_ips_id_seq OWNED BY public.network_ips.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    link character varying(255),
    ref_id integer,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    user_id integer
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: password_vault; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_vault (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    username character varying(255),
    password_encrypted text NOT NULL,
    url character varying(500),
    category character varying(100),
    service_type character varying(100),
    notes text,
    tags text,
    is_favorite boolean DEFAULT false,
    last_used timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.password_vault OWNER TO postgres;

--
-- Name: password_vault_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.password_vault_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.password_vault_id_seq OWNER TO postgres;

--
-- Name: password_vault_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.password_vault_id_seq OWNED BY public.password_vault.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id integer NOT NULL,
    code character varying(100) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    category_id integer,
    unit character varying(50) DEFAULT 'قطعة'::character varying,
    unit_price numeric(10,2) DEFAULT 0,
    current_stock integer DEFAULT 0,
    min_stock_alert integer DEFAULT 10,
    image_url text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.products_id_seq OWNER TO postgres;

--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: servers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.servers (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    hostname character varying(255),
    public_ip character varying(45),
    private_ip character varying(45),
    ssh_port integer DEFAULT 22,
    server_type character varying(100),
    provider character varying(255),
    location character varying(255),
    os character varying(255),
    cpu character varying(255),
    ram character varying(100),
    storage character varying(255),
    username character varying(255),
    password_encrypted text,
    ssh_key text,
    notes text,
    status character varying(50) DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.servers OWNER TO postgres;

--
-- Name: servers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.servers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.servers_id_seq OWNER TO postgres;

--
-- Name: servers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.servers_id_seq OWNED BY public.servers.id;


--
-- Name: sla_breaches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sla_breaches (
    id integer NOT NULL,
    ticket_id integer,
    breach_type character varying(50) NOT NULL,
    policy_id integer,
    target_minutes integer,
    actual_minutes integer,
    breached_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    escalated boolean DEFAULT false,
    escalated_to integer,
    notes text
);


ALTER TABLE public.sla_breaches OWNER TO postgres;

--
-- Name: sla_breaches_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sla_breaches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sla_breaches_id_seq OWNER TO postgres;

--
-- Name: sla_breaches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sla_breaches_id_seq OWNED BY public.sla_breaches.id;


--
-- Name: sla_policies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sla_policies (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    priority character varying(50) NOT NULL,
    response_time_minutes integer DEFAULT 60 NOT NULL,
    resolution_time_minutes integer DEFAULT 480 NOT NULL,
    escalation_enabled boolean DEFAULT true,
    escalation_after_minutes integer DEFAULT 120,
    escalation_to integer,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.sla_policies OWNER TO postgres;

--
-- Name: sla_policies_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sla_policies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sla_policies_id_seq OWNER TO postgres;

--
-- Name: sla_policies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sla_policies_id_seq OWNED BY public.sla_policies.id;


--
-- Name: stock_movements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_movements (
    id integer NOT NULL,
    product_id integer NOT NULL,
    movement_type character varying(20) NOT NULL,
    quantity integer NOT NULL,
    reason character varying(255),
    notes text,
    user_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT stock_movements_movement_type_check CHECK (((movement_type)::text = ANY (ARRAY[('in'::character varying)::text, ('out'::character varying)::text])))
);


ALTER TABLE public.stock_movements OWNER TO postgres;

--
-- Name: stock_movements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.stock_movements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stock_movements_id_seq OWNER TO postgres;

--
-- Name: stock_movements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stock_movements_id_seq OWNED BY public.stock_movements.id;


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subscriptions (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    provider character varying(255),
    subscription_type character varying(100),
    cost numeric(10,2),
    billing_cycle character varying(50) DEFAULT 'monthly'::character varying,
    start_date date,
    end_date date,
    auto_renew boolean DEFAULT false,
    login_url character varying(500),
    username character varying(255),
    password_encrypted text,
    notes text,
    status character varying(50) DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.subscriptions OWNER TO postgres;

--
-- Name: subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.subscriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subscriptions_id_seq OWNER TO postgres;

--
-- Name: subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.subscriptions_id_seq OWNED BY public.subscriptions.id;


--
-- Name: task_comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.task_comments (
    id integer NOT NULL,
    task_id integer NOT NULL,
    user_id integer,
    comment text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.task_comments OWNER TO postgres;

--
-- Name: task_comments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.task_comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.task_comments_id_seq OWNER TO postgres;

--
-- Name: task_comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.task_comments_id_seq OWNED BY public.task_comments.id;


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tasks (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    status character varying(50) DEFAULT 'todo'::character varying,
    priority character varying(20) DEFAULT 'medium'::character varying,
    "position" integer DEFAULT 0,
    assigned_to integer,
    created_by integer,
    due_date date,
    related_type character varying(50),
    related_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT tasks_priority_check CHECK (((priority)::text = ANY (ARRAY[('low'::character varying)::text, ('medium'::character varying)::text, ('high'::character varying)::text, ('urgent'::character varying)::text]))),
    CONSTRAINT tasks_status_check CHECK (((status)::text = ANY (ARRAY[('todo'::character varying)::text, ('in_progress'::character varying)::text, ('review'::character varying)::text, ('done'::character varying)::text])))
);


ALTER TABLE public.tasks OWNER TO postgres;

--
-- Name: tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tasks_id_seq OWNER TO postgres;

--
-- Name: tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tasks_id_seq OWNED BY public.tasks.id;


--
-- Name: ticket_comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ticket_comments (
    id integer NOT NULL,
    ticket_id integer,
    user_id integer,
    user_name character varying(255),
    comment text NOT NULL,
    is_internal boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.ticket_comments OWNER TO postgres;

--
-- Name: ticket_comments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ticket_comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ticket_comments_id_seq OWNER TO postgres;

--
-- Name: ticket_comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ticket_comments_id_seq OWNED BY public.ticket_comments.id;


--
-- Name: tickets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tickets (
    id integer NOT NULL,
    ticket_number character varying(20) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    category character varying(50) DEFAULT 'general'::character varying,
    priority character varying(20) DEFAULT 'medium'::character varying,
    status character varying(20) DEFAULT 'new'::character varying,
    requester_id integer,
    requester_name character varying(255),
    requester_email character varying(255),
    requester_phone character varying(50),
    requester_department character varying(255),
    assigned_to integer,
    assigned_to_name character varying(255),
    device_id integer,
    resolution text,
    resolved_at timestamp without time zone,
    closed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    sla_policy_id integer,
    response_deadline timestamp without time zone,
    resolution_deadline timestamp without time zone,
    first_response_at timestamp without time zone,
    response_breached boolean DEFAULT false,
    resolution_breached boolean DEFAULT false,
    escalated boolean DEFAULT false,
    escalated_to integer,
    escalated_at timestamp without time zone
);


ALTER TABLE public.tickets OWNER TO postgres;

--
-- Name: tickets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tickets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tickets_id_seq OWNER TO postgres;

--
-- Name: tickets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tickets_id_seq OWNED BY public.tickets.id;


--
-- Name: user_guides; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_guides (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    category character varying(100) NOT NULL,
    description text,
    created_by character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_guides OWNER TO postgres;

--
-- Name: user_guides_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_guides_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_guides_id_seq OWNER TO postgres;

--
-- Name: user_guides_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_guides_id_seq OWNED BY public.user_guides.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    full_name character varying(255) NOT NULL,
    role character varying(50) DEFAULT 'admin'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    phone character varying(50),
    permissions jsonb DEFAULT '{}'::jsonb,
    avatar character varying(255),
    is_active boolean DEFAULT true,
    ad_guid character varying(255),
    is_ad_user boolean DEFAULT false,
    ad_username character varying(255)
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: voip_config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.voip_config (
    id integer NOT NULL,
    pbx_type character varying(50) DEFAULT 'grandstream'::character varying,
    server_url character varying(500) DEFAULT ''::character varying NOT NULL,
    port integer DEFAULT 8089,
    username character varying(255) DEFAULT ''::character varying NOT NULL,
    password text DEFAULT ''::text NOT NULL,
    use_ssl boolean DEFAULT true,
    auto_sync_enabled boolean DEFAULT false,
    sync_interval_minutes integer DEFAULT 60,
    last_sync_at timestamp without time zone,
    last_sync_status character varying(50),
    last_sync_message text,
    last_sync_count integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.voip_config OWNER TO postgres;

--
-- Name: voip_config_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.voip_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.voip_config_id_seq OWNER TO postgres;

--
-- Name: voip_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.voip_config_id_seq OWNED BY public.voip_config.id;


--
-- Name: voip_extensions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.voip_extensions (
    id integer NOT NULL,
    extension character varying(20) NOT NULL,
    caller_id_name character varying(255),
    caller_id_number character varying(50),
    department character varying(255),
    email character varying(255),
    account_type character varying(50) DEFAULT 'SIP'::character varying,
    status character varying(50) DEFAULT 'active'::character varying,
    employee_id integer,
    mac_address character varying(50),
    ip_address character varying(50),
    device_model character varying(255),
    out_of_service character varying(10) DEFAULT 'no'::character varying,
    enable_ldap character varying(10),
    raw_data jsonb,
    last_synced_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.voip_extensions OWNER TO postgres;

--
-- Name: voip_extensions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.voip_extensions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.voip_extensions_id_seq OWNER TO postgres;

--
-- Name: voip_extensions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.voip_extensions_id_seq OWNED BY public.voip_extensions.id;


--
-- Name: voip_sync_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.voip_sync_logs (
    id integer NOT NULL,
    sync_type character varying(50) DEFAULT 'extensions'::character varying,
    total_found integer DEFAULT 0,
    new_count integer DEFAULT 0,
    updated_count integer DEFAULT 0,
    error_count integer DEFAULT 0,
    status character varying(50),
    message text,
    details jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.voip_sync_logs OWNER TO postgres;

--
-- Name: voip_sync_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.voip_sync_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.voip_sync_logs_id_seq OWNER TO postgres;

--
-- Name: voip_sync_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.voip_sync_logs_id_seq OWNED BY public.voip_sync_logs.id;


--
-- Name: zk_devices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.zk_devices (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    ip_address character varying(50) NOT NULL,
    port integer DEFAULT 4370,
    is_active boolean DEFAULT true,
    last_sync_at timestamp without time zone,
    last_sync_status character varying(50),
    total_users integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.zk_devices OWNER TO postgres;

--
-- Name: zk_devices_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.zk_devices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.zk_devices_id_seq OWNER TO postgres;

--
-- Name: zk_devices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.zk_devices_id_seq OWNED BY public.zk_devices.id;


--
-- Name: zk_employee_map; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.zk_employee_map (
    id integer NOT NULL,
    zk_user_id character varying(50) NOT NULL,
    zk_user_name character varying(255),
    employee_id integer,
    device_id integer,
    is_mapped boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.zk_employee_map OWNER TO postgres;

--
-- Name: zk_employee_map_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.zk_employee_map_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.zk_employee_map_id_seq OWNER TO postgres;

--
-- Name: zk_employee_map_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.zk_employee_map_id_seq OWNED BY public.zk_employee_map.id;


--
-- Name: accessories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accessories ALTER COLUMN id SET DEFAULT nextval('public.accessories_id_seq'::regclass);


--
-- Name: accessory_assignments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accessory_assignments ALTER COLUMN id SET DEFAULT nextval('public.accessory_assignments_id_seq'::regclass);


--
-- Name: accessory_stock_movements id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accessory_stock_movements ALTER COLUMN id SET DEFAULT nextval('public.accessory_stock_movements_id_seq'::regclass);


--
-- Name: activity_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs ALTER COLUMN id SET DEFAULT nextval('public.activity_logs_id_seq'::regclass);


--
-- Name: ad_computers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ad_computers ALTER COLUMN id SET DEFAULT nextval('public.ad_computers_id_seq'::regclass);


--
-- Name: ad_computers_cache id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ad_computers_cache ALTER COLUMN id SET DEFAULT nextval('public.ad_computers_cache_id_seq'::regclass);


--
-- Name: ad_config id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ad_config ALTER COLUMN id SET DEFAULT nextval('public.ad_config_id_seq'::regclass);


--
-- Name: ad_groups_ous id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ad_groups_ous ALTER COLUMN id SET DEFAULT nextval('public.ad_groups_ous_id_seq'::regclass);


--
-- Name: ad_sync_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ad_sync_logs ALTER COLUMN id SET DEFAULT nextval('public.ad_sync_logs_id_seq'::regclass);


--
-- Name: ad_users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ad_users ALTER COLUMN id SET DEFAULT nextval('public.ad_users_id_seq'::regclass);


--
-- Name: agent_keys id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_keys ALTER COLUMN id SET DEFAULT nextval('public.agent_keys_id_seq'::regclass);


--
-- Name: assignment_accessories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_accessories ALTER COLUMN id SET DEFAULT nextval('public.assignment_accessories_id_seq'::regclass);


--
-- Name: attendance_records id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_records ALTER COLUMN id SET DEFAULT nextval('public.attendance_records_id_seq'::regclass);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: departments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments ALTER COLUMN id SET DEFAULT nextval('public.departments_id_seq'::regclass);


--
-- Name: device_assignments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_assignments ALTER COLUMN id SET DEFAULT nextval('public.device_assignments_id_seq'::regclass);


--
-- Name: device_types id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_types ALTER COLUMN id SET DEFAULT nextval('public.device_types_id_seq'::regclass);


--
-- Name: devices id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devices ALTER COLUMN id SET DEFAULT nextval('public.devices_id_seq'::regclass);


--
-- Name: email_accounts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_accounts ALTER COLUMN id SET DEFAULT nextval('public.email_accounts_id_seq'::regclass);


--
-- Name: email_broadcasts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_broadcasts ALTER COLUMN id SET DEFAULT nextval('public.email_broadcasts_id_seq'::regclass);


--
-- Name: employees id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees ALTER COLUMN id SET DEFAULT nextval('public.employees_id_seq'::regclass);


--
-- Name: guide_steps id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.guide_steps ALTER COLUMN id SET DEFAULT nextval('public.guide_steps_id_seq'::regclass);


--
-- Name: hosting_config id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hosting_config ALTER COLUMN id SET DEFAULT nextval('public.hosting_config_id_seq'::regclass);


--
-- Name: hosting_sync_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hosting_sync_logs ALTER COLUMN id SET DEFAULT nextval('public.hosting_sync_logs_id_seq'::regclass);


--
-- Name: it_access_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.it_access_logs ALTER COLUMN id SET DEFAULT nextval('public.it_access_logs_id_seq'::regclass);


--
-- Name: license_assignments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.license_assignments ALTER COLUMN id SET DEFAULT nextval('public.license_assignments_id_seq'::regclass);


--
-- Name: licenses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.licenses ALTER COLUMN id SET DEFAULT nextval('public.licenses_id_seq'::regclass);


--
-- Name: maintenance_records id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_records ALTER COLUMN id SET DEFAULT nextval('public.maintenance_records_id_seq'::regclass);


--
-- Name: maintenance_schedules id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_schedules ALTER COLUMN id SET DEFAULT nextval('public.maintenance_schedules_id_seq'::regclass);


--
-- Name: network_ips id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.network_ips ALTER COLUMN id SET DEFAULT nextval('public.network_ips_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: password_vault id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_vault ALTER COLUMN id SET DEFAULT nextval('public.password_vault_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: servers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.servers ALTER COLUMN id SET DEFAULT nextval('public.servers_id_seq'::regclass);


--
-- Name: sla_breaches id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sla_breaches ALTER COLUMN id SET DEFAULT nextval('public.sla_breaches_id_seq'::regclass);


--
-- Name: sla_policies id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sla_policies ALTER COLUMN id SET DEFAULT nextval('public.sla_policies_id_seq'::regclass);


--
-- Name: stock_movements id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_movements ALTER COLUMN id SET DEFAULT nextval('public.stock_movements_id_seq'::regclass);


--
-- Name: subscriptions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions ALTER COLUMN id SET DEFAULT nextval('public.subscriptions_id_seq'::regclass);


--
-- Name: task_comments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_comments ALTER COLUMN id SET DEFAULT nextval('public.task_comments_id_seq'::regclass);


--
-- Name: tasks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks ALTER COLUMN id SET DEFAULT nextval('public.tasks_id_seq'::regclass);


--
-- Name: ticket_comments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_comments ALTER COLUMN id SET DEFAULT nextval('public.ticket_comments_id_seq'::regclass);


--
-- Name: tickets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets ALTER COLUMN id SET DEFAULT nextval('public.tickets_id_seq'::regclass);


--
-- Name: user_guides id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_guides ALTER COLUMN id SET DEFAULT nextval('public.user_guides_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: voip_config id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.voip_config ALTER COLUMN id SET DEFAULT nextval('public.voip_config_id_seq'::regclass);


--
-- Name: voip_extensions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.voip_extensions ALTER COLUMN id SET DEFAULT nextval('public.voip_extensions_id_seq'::regclass);


--
-- Name: voip_sync_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.voip_sync_logs ALTER COLUMN id SET DEFAULT nextval('public.voip_sync_logs_id_seq'::regclass);


--
-- Name: zk_devices id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.zk_devices ALTER COLUMN id SET DEFAULT nextval('public.zk_devices_id_seq'::regclass);


--
-- Name: zk_employee_map id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.zk_employee_map ALTER COLUMN id SET DEFAULT nextval('public.zk_employee_map_id_seq'::regclass);


--
-- Name: accessories accessories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accessories
    ADD CONSTRAINT accessories_pkey PRIMARY KEY (id);


--
-- Name: accessory_assignments accessory_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accessory_assignments
    ADD CONSTRAINT accessory_assignments_pkey PRIMARY KEY (id);


--
-- Name: accessory_stock_movements accessory_stock_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accessory_stock_movements
    ADD CONSTRAINT accessory_stock_movements_pkey PRIMARY KEY (id);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: ad_computers_cache ad_computers_cache_computer_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ad_computers_cache
    ADD CONSTRAINT ad_computers_cache_computer_name_key UNIQUE (computer_name);


--
-- Name: ad_computers_cache ad_computers_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ad_computers_cache
    ADD CONSTRAINT ad_computers_cache_pkey PRIMARY KEY (id);


--
-- Name: ad_computers ad_computers_computer_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ad_computers
    ADD CONSTRAINT ad_computers_computer_name_key UNIQUE (computer_name);


--
-- Name: ad_computers ad_computers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ad_computers
    ADD CONSTRAINT ad_computers_pkey PRIMARY KEY (id);


--
-- Name: ad_config ad_config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ad_config
    ADD CONSTRAINT ad_config_pkey PRIMARY KEY (id);


--
-- Name: ad_groups_ous ad_groups_ous_distinguished_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ad_groups_ous
    ADD CONSTRAINT ad_groups_ous_distinguished_name_key UNIQUE (distinguished_name);


--
-- Name: ad_groups_ous ad_groups_ous_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ad_groups_ous
    ADD CONSTRAINT ad_groups_ous_pkey PRIMARY KEY (id);


--
-- Name: ad_sync_logs ad_sync_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ad_sync_logs
    ADD CONSTRAINT ad_sync_logs_pkey PRIMARY KEY (id);


--
-- Name: ad_users ad_users_ad_guid_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ad_users
    ADD CONSTRAINT ad_users_ad_guid_key UNIQUE (ad_guid);


--
-- Name: ad_users ad_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ad_users
    ADD CONSTRAINT ad_users_pkey PRIMARY KEY (id);


--
-- Name: agent_keys agent_keys_key_hash_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_keys
    ADD CONSTRAINT agent_keys_key_hash_key UNIQUE (key_hash);


--
-- Name: agent_keys agent_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_keys
    ADD CONSTRAINT agent_keys_pkey PRIMARY KEY (id);


--
-- Name: assignment_accessories assignment_accessories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_accessories
    ADD CONSTRAINT assignment_accessories_pkey PRIMARY KEY (id);


--
-- Name: attendance_records attendance_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_pkey PRIMARY KEY (id);


--
-- Name: attendance_records attendance_records_zk_user_id_timestamp_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_zk_user_id_timestamp_key UNIQUE (zk_user_id, "timestamp");


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: departments departments_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_code_key UNIQUE (code);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: device_assignments device_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_assignments
    ADD CONSTRAINT device_assignments_pkey PRIMARY KEY (id);


--
-- Name: device_types device_types_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_types
    ADD CONSTRAINT device_types_name_key UNIQUE (name);


--
-- Name: device_types device_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_types
    ADD CONSTRAINT device_types_pkey PRIMARY KEY (id);


--
-- Name: devices devices_asset_tag_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_asset_tag_key UNIQUE (asset_tag);


--
-- Name: devices devices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_pkey PRIMARY KEY (id);


--
-- Name: email_accounts email_accounts_email_address_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_accounts
    ADD CONSTRAINT email_accounts_email_address_key UNIQUE (email_address);


--
-- Name: email_accounts email_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_accounts
    ADD CONSTRAINT email_accounts_pkey PRIMARY KEY (id);


--
-- Name: email_broadcasts email_broadcasts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_broadcasts
    ADD CONSTRAINT email_broadcasts_pkey PRIMARY KEY (id);


--
-- Name: employees employees_employee_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_employee_code_key UNIQUE (employee_code);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: guide_steps guide_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.guide_steps
    ADD CONSTRAINT guide_steps_pkey PRIMARY KEY (id);


--
-- Name: hosting_config hosting_config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hosting_config
    ADD CONSTRAINT hosting_config_pkey PRIMARY KEY (id);


--
-- Name: hosting_sync_logs hosting_sync_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hosting_sync_logs
    ADD CONSTRAINT hosting_sync_logs_pkey PRIMARY KEY (id);


--
-- Name: it_access_logs it_access_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.it_access_logs
    ADD CONSTRAINT it_access_logs_pkey PRIMARY KEY (id);


--
-- Name: license_assignments license_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.license_assignments
    ADD CONSTRAINT license_assignments_pkey PRIMARY KEY (id);


--
-- Name: licenses licenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.licenses
    ADD CONSTRAINT licenses_pkey PRIMARY KEY (id);


--
-- Name: maintenance_records maintenance_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_records
    ADD CONSTRAINT maintenance_records_pkey PRIMARY KEY (id);


--
-- Name: maintenance_schedules maintenance_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_schedules
    ADD CONSTRAINT maintenance_schedules_pkey PRIMARY KEY (id);


--
-- Name: network_ips network_ips_ip_address_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.network_ips
    ADD CONSTRAINT network_ips_ip_address_key UNIQUE (ip_address);


--
-- Name: network_ips network_ips_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.network_ips
    ADD CONSTRAINT network_ips_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: password_vault password_vault_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_vault
    ADD CONSTRAINT password_vault_pkey PRIMARY KEY (id);


--
-- Name: products products_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_code_key UNIQUE (code);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: servers servers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.servers
    ADD CONSTRAINT servers_pkey PRIMARY KEY (id);


--
-- Name: sla_breaches sla_breaches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sla_breaches
    ADD CONSTRAINT sla_breaches_pkey PRIMARY KEY (id);


--
-- Name: sla_policies sla_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sla_policies
    ADD CONSTRAINT sla_policies_pkey PRIMARY KEY (id);


--
-- Name: stock_movements stock_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: task_comments task_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT task_comments_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: ticket_comments ticket_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_comments
    ADD CONSTRAINT ticket_comments_pkey PRIMARY KEY (id);


--
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- Name: tickets tickets_ticket_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_ticket_number_key UNIQUE (ticket_number);


--
-- Name: sla_policies unique_priority_policy; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sla_policies
    ADD CONSTRAINT unique_priority_policy UNIQUE (priority);


--
-- Name: user_guides user_guides_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_guides
    ADD CONSTRAINT user_guides_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: voip_config voip_config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.voip_config
    ADD CONSTRAINT voip_config_pkey PRIMARY KEY (id);


--
-- Name: voip_extensions voip_extensions_extension_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.voip_extensions
    ADD CONSTRAINT voip_extensions_extension_key UNIQUE (extension);


--
-- Name: voip_extensions voip_extensions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.voip_extensions
    ADD CONSTRAINT voip_extensions_pkey PRIMARY KEY (id);


--
-- Name: voip_sync_logs voip_sync_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.voip_sync_logs
    ADD CONSTRAINT voip_sync_logs_pkey PRIMARY KEY (id);


--
-- Name: zk_devices zk_devices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.zk_devices
    ADD CONSTRAINT zk_devices_pkey PRIMARY KEY (id);


--
-- Name: zk_employee_map zk_employee_map_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.zk_employee_map
    ADD CONSTRAINT zk_employee_map_pkey PRIMARY KEY (id);


--
-- Name: zk_employee_map zk_employee_map_zk_user_id_device_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.zk_employee_map
    ADD CONSTRAINT zk_employee_map_zk_user_id_device_id_key UNIQUE (zk_user_id, device_id);


--
-- Name: idx_activity_logs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_logs_created_at ON public.activity_logs USING btree (created_at DESC);


--
-- Name: idx_activity_logs_entity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_logs_entity ON public.activity_logs USING btree (entity_type, entity_id);


--
-- Name: idx_activity_logs_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_logs_user ON public.activity_logs USING btree (user_id);


--
-- Name: idx_ad_users_sam_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_ad_users_sam_unique ON public.ad_users USING btree (sam_account_name);


--
-- Name: idx_attendance_employee; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attendance_employee ON public.attendance_records USING btree (employee_id);


--
-- Name: idx_attendance_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attendance_timestamp ON public.attendance_records USING btree ("timestamp");


--
-- Name: idx_attendance_zk_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attendance_zk_user ON public.attendance_records USING btree (zk_user_id);


--
-- Name: idx_notifications_is_read; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (is_read);


--
-- Name: idx_notifications_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_type ON public.notifications USING btree (type);


--
-- Name: idx_ticket_comments_ticket; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ticket_comments_ticket ON public.ticket_comments USING btree (ticket_id);


--
-- Name: idx_tickets_assigned; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tickets_assigned ON public.tickets USING btree (assigned_to);


--
-- Name: idx_tickets_requester; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tickets_requester ON public.tickets USING btree (requester_id);


--
-- Name: idx_tickets_sla_deadlines; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tickets_sla_deadlines ON public.tickets USING btree (response_deadline, resolution_deadline) WHERE ((status)::text <> ALL (ARRAY[('resolved'::character varying)::text, ('closed'::character varying)::text]));


--
-- Name: idx_tickets_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tickets_status ON public.tickets USING btree (status);


--
-- Name: accessory_assignments accessory_assignments_accessory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accessory_assignments
    ADD CONSTRAINT accessory_assignments_accessory_id_fkey FOREIGN KEY (accessory_id) REFERENCES public.accessories(id) ON DELETE CASCADE;


--
-- Name: accessory_assignments accessory_assignments_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accessory_assignments
    ADD CONSTRAINT accessory_assignments_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: accessory_stock_movements accessory_stock_movements_accessory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accessory_stock_movements
    ADD CONSTRAINT accessory_stock_movements_accessory_id_fkey FOREIGN KEY (accessory_id) REFERENCES public.accessories(id) ON DELETE CASCADE;


--
-- Name: activity_logs activity_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: ad_computers ad_computers_assigned_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ad_computers
    ADD CONSTRAINT ad_computers_assigned_employee_id_fkey FOREIGN KEY (assigned_employee_id) REFERENCES public.employees(id) ON DELETE SET NULL;


--
-- Name: ad_groups_ous ad_groups_ous_local_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ad_groups_ous
    ADD CONSTRAINT ad_groups_ous_local_department_id_fkey FOREIGN KEY (local_department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: ad_users ad_users_local_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ad_users
    ADD CONSTRAINT ad_users_local_employee_id_fkey FOREIGN KEY (local_employee_id) REFERENCES public.employees(id) ON DELETE SET NULL;


--
-- Name: ad_users ad_users_local_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ad_users
    ADD CONSTRAINT ad_users_local_user_id_fkey FOREIGN KEY (local_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: agent_keys agent_keys_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_keys
    ADD CONSTRAINT agent_keys_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: assignment_accessories assignment_accessories_accessory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_accessories
    ADD CONSTRAINT assignment_accessories_accessory_id_fkey FOREIGN KEY (accessory_id) REFERENCES public.accessories(id) ON DELETE CASCADE;


--
-- Name: assignment_accessories assignment_accessories_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_accessories
    ADD CONSTRAINT assignment_accessories_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.device_assignments(id) ON DELETE CASCADE;


--
-- Name: attendance_records attendance_records_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.zk_devices(id);


--
-- Name: attendance_records attendance_records_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: device_assignments device_assignments_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_assignments
    ADD CONSTRAINT device_assignments_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id);


--
-- Name: device_assignments device_assignments_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_assignments
    ADD CONSTRAINT device_assignments_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: devices devices_device_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_device_type_id_fkey FOREIGN KEY (device_type_id) REFERENCES public.device_types(id);


--
-- Name: email_accounts email_accounts_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_accounts
    ADD CONSTRAINT email_accounts_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE SET NULL;


--
-- Name: employees employees_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: guide_steps guide_steps_guide_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.guide_steps
    ADD CONSTRAINT guide_steps_guide_id_fkey FOREIGN KEY (guide_id) REFERENCES public.user_guides(id) ON DELETE CASCADE;


--
-- Name: license_assignments license_assignments_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.license_assignments
    ADD CONSTRAINT license_assignments_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id) ON DELETE SET NULL;


--
-- Name: license_assignments license_assignments_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.license_assignments
    ADD CONSTRAINT license_assignments_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE SET NULL;


--
-- Name: license_assignments license_assignments_license_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.license_assignments
    ADD CONSTRAINT license_assignments_license_id_fkey FOREIGN KEY (license_id) REFERENCES public.licenses(id) ON DELETE CASCADE;


--
-- Name: maintenance_records maintenance_records_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_records
    ADD CONSTRAINT maintenance_records_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id);


--
-- Name: maintenance_schedules maintenance_schedules_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_schedules
    ADD CONSTRAINT maintenance_schedules_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: maintenance_schedules maintenance_schedules_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_schedules
    ADD CONSTRAINT maintenance_schedules_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: sla_breaches sla_breaches_escalated_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sla_breaches
    ADD CONSTRAINT sla_breaches_escalated_to_fkey FOREIGN KEY (escalated_to) REFERENCES public.users(id);


--
-- Name: sla_breaches sla_breaches_policy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sla_breaches
    ADD CONSTRAINT sla_breaches_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES public.sla_policies(id);


--
-- Name: sla_breaches sla_breaches_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sla_breaches
    ADD CONSTRAINT sla_breaches_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- Name: sla_policies sla_policies_escalation_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sla_policies
    ADD CONSTRAINT sla_policies_escalation_to_fkey FOREIGN KEY (escalation_to) REFERENCES public.users(id);


--
-- Name: stock_movements stock_movements_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: stock_movements stock_movements_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: task_comments task_comments_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT task_comments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_comments task_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT task_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: ticket_comments ticket_comments_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_comments
    ADD CONSTRAINT ticket_comments_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- Name: ticket_comments ticket_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_comments
    ADD CONSTRAINT ticket_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: tickets tickets_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: tickets tickets_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id);


--
-- Name: tickets tickets_escalated_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_escalated_to_fkey FOREIGN KEY (escalated_to) REFERENCES public.users(id);


--
-- Name: tickets tickets_requester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.employees(id);


--
-- Name: tickets tickets_sla_policy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_sla_policy_id_fkey FOREIGN KEY (sla_policy_id) REFERENCES public.sla_policies(id);


--
-- Name: voip_extensions voip_extensions_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.voip_extensions
    ADD CONSTRAINT voip_extensions_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE SET NULL;


--
-- Name: zk_employee_map zk_employee_map_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.zk_employee_map
    ADD CONSTRAINT zk_employee_map_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.zk_devices(id);


--
-- Name: zk_employee_map zk_employee_map_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.zk_employee_map
    ADD CONSTRAINT zk_employee_map_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- PostgreSQL database dump complete
--

\unrestrict 0ARrSTQc3V1OYT2ixLrKsvkgElWuEhtIiHQoiReYO7kcU2DIpbKajLPPlOVUKTw

