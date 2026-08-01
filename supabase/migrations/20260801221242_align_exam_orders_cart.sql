alter table public.exam_orders
  add column if not exists origin text not null default 'reception',
  add column if not exists subtotal_cents integer not null default 0,
  add column if not exists discount_cents integer not null default 0,
  add column if not exists total_cents integer not null default 0;

alter table public.exam_orders
  alter column exam_id drop not null;

with totals as (
  select
    o.id,
    coalesce(
      sum(
        case
          when coalesce(i.covered_by_insurance, false) then 0
          else coalesce(i.price_cents, 0)
        end
      ) filter (where i.id is not null),
      e.price_cents,
      0
    )::integer as subtotal
  from public.exam_orders o
  left join public.exam_order_items i on i.order_id = o.id
  left join public.exam_catalog e on e.id = o.exam_id
  group by o.id, e.price_cents
)
update public.exam_orders o
set
  subtotal_cents = totals.subtotal,
  total_cents = greatest(0, totals.subtotal - coalesce(o.discount_cents, 0))
from totals
where totals.id = o.id;
