-- SnackOffice: catálogo central de clientes.
-- Ejecutar una vez en Supabase antes de importar el Excel definitivo (guardado como CSV UTF-8).

CREATE TABLE IF NOT EXISTS public.clientes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_original text,
    nombre text NOT NULL,
    clave_normalizada text NOT NULL UNIQUE,
    activo boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.clientes TO authenticated;

DROP POLICY IF EXISTS clientes_select_authenticated ON public.clientes;
CREATE POLICY clientes_select_authenticated ON public.clientes
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS clientes_write_admin_master ON public.clientes;
CREATE POLICY clientes_write_admin_master ON public.clientes
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND UPPER(p.rol) IN ('MASTER','ADMIN')
            AND COALESCE(p.activo,true)=true)
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND UPPER(p.rol) IN ('MASTER','ADMIN')
            AND COALESCE(p.activo,true)=true)
);
