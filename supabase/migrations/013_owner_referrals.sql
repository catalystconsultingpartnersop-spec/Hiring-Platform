-- Who sent a business owner to us (a rep or a networker), from their share link.
alter table owners add column if not exists referred_by text;
