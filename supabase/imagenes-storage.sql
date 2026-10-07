-- SnackOffice: Storage para imágenes de productos
-- Ejecutar una sola vez en Supabase > SQL Editor.

insert into storage.buckets (id, name, public)
values ('producto-imagenes', 'producto-imagenes', true)
on conflict (id) do update set public = true;

-- Lectura pública de archivos del bucket.
create policy "SnackOffice imagenes - lectura"
on storage.objects
for select
to anon
using (bucket_id = 'producto-imagenes');

-- Permitir que SnackOffice suba nuevas imágenes.
create policy "SnackOffice imagenes - subida"
on storage.objects
for insert
to anon
with check (bucket_id = 'producto-imagenes');

-- Permitir reemplazar/actualizar archivos si se utiliza la API de Storage.
create policy "SnackOffice imagenes - actualizacion"
on storage.objects
for update
to anon
using (bucket_id = 'producto-imagenes')
with check (bucket_id = 'producto-imagenes');

-- Permitir eliminar imágenes desde el módulo Inventario.
create policy "SnackOffice imagenes - eliminacion"
on storage.objects
for delete
to anon
using (bucket_id = 'producto-imagenes');
