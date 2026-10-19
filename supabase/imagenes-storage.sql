-- SnackOffice: Storage para imágenes de productos.
-- Ejecutar y validar primero en un entorno de pruebas.
-- La lectura pública se conserva; las escrituras requieren un perfil activo MASTER/ADMIN.

insert into storage.buckets (id, name, public)
values ('producto-imagenes', 'producto-imagenes', true)
on conflict (id) do update set public = true;

-- Lectura pública para mostrar imágenes en los distintos dispositivos.
drop policy if exists "SnackOffice imagenes - lectura" on storage.objects;
create policy "SnackOffice imagenes - lectura"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'producto-imagenes');

-- Solo usuarios autenticados con perfil activo MASTER o ADMIN pueden escribir.
drop policy if exists "SnackOffice imagenes - subida" on storage.objects;
create policy "SnackOffice imagenes - subida"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'producto-imagenes'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and upper(p.rol) in ('MASTER', 'ADMIN')
      and coalesce(p.activo, true) = true
  )
);

drop policy if exists "SnackOffice imagenes - actualizacion" on storage.objects;
create policy "SnackOffice imagenes - actualizacion"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'producto-imagenes'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and upper(p.rol) in ('MASTER', 'ADMIN')
      and coalesce(p.activo, true) = true
  )
)
with check (
  bucket_id = 'producto-imagenes'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and upper(p.rol) in ('MASTER', 'ADMIN')
      and coalesce(p.activo, true) = true
  )
);

drop policy if exists "SnackOffice imagenes - eliminacion" on storage.objects;
create policy "SnackOffice imagenes - eliminacion"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'producto-imagenes'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and upper(p.rol) in ('MASTER', 'ADMIN')
      and coalesce(p.activo, true) = true
  )
);
