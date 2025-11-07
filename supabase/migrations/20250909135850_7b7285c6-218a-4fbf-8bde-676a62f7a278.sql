-- Remove duplicate activities from September 8th, 2025
-- Keep the first occurrence of each unique activity and delete the rest

DELETE FROM lead_activities 
WHERE id IN (
  -- All duplicate IDs to delete (keeping the first occurrence of each)
  'abf1d942-ea25-4530-9de7-8513bd25e02d', 'cff9bb6c-83a2-4daa-9ddc-b94ee0ecff0e', 
  '089a90a0-5c2f-4aa9-9e3d-e72104f4a5f8', '1f83d8a7-b40e-4ddc-a07a-41180ca3f940', 
  'f33e5280-641b-4939-89cb-281eec3d56fa', '622d1cc3-daa2-430f-a54f-5f427e174970', 
  '09701eff-8244-4fa9-8549-893aac827617', 'a0fdc4cc-9c7c-4565-84ed-647c544b6190',
  'b32ef255-7dfa-48ae-b31e-213af27ecbc8', 'eb100caf-b1e3-4ce4-b0b1-5de44ceaffb0', 
  '165a0ca5-f589-4088-808c-34a38ebcddd8', 'fe89ac88-5393-49c7-90c5-debcbf6a5388', 
  'cd40a89c-a3cf-4838-b7ac-c7d3fcf5366b', '99aa60de-8da8-49f5-be63-18641f12a18f', 
  '784ac34c-0d63-414c-b1ce-58694ea42274', '66111a8b-e9de-47a2-af71-b6ed215bc7d9', 
  'cc9a3129-390b-4942-9890-1760c65e7a5d', 'e83aabf1-0a42-4737-8c30-7a3397dc9217', 
  '6c49da70-869e-4459-b057-727772f64a59', '0315ec69-6300-45c1-b692-29bedb728b99', 
  'a8657545-572d-40db-a1ea-91549d51d963', 'd47050f8-8129-4965-b239-1bc2f43abf60',
  '78994b1d-4492-4adf-81ac-7bccd72de88f', '4e641bd3-c712-4c08-97d6-9d338fd52644', 
  '0f4267e8-bd4c-4d88-bc1c-d44cb8acb62b', '83c4b5aa-dc6d-4a8f-8142-bfec538c7ed2', 
  'da1fa088-91c9-4653-a23a-89881c4348c3', '01f918b3-02d3-4c21-809b-bf7e3e3e9478', 
  'e6844933-a8c4-4aaf-9fd6-3b0d89062b5d', '382bff86-ae34-4f1c-93f7-ff0213c946d6', 
  'd5d8846d-081b-4dcf-aa58-dc7191220592', '4851c610-8d75-4855-ae96-f6afab7fba93', 
  'c00e3d7d-cc59-4a40-9eff-b8aad6f5d782', 'e6252551-c412-4b68-adda-d8abd99f2676', 
  'c53b53fd-891f-47ac-9f61-bb1b526abb01', '42d20569-7a6d-4bfb-b405-614227eb11ac', 
  'e1eebda8-76ad-458e-b478-cce19ae9e6b4', 'cc0fca6d-0b01-42d8-aea3-d6338b0bd20b', 
  '7e2c778b-55bc-4290-b168-4608072d6260', '6966dcd9-eacd-40ce-81bf-a46facf5532c',
  '5ed65119-fe71-449a-85f7-56a0d92f56cd', '4acac4eb-03ee-418d-b730-dc38e685bb86', 
  '63979b0a-f795-41c3-90e2-65a9f95532ca', '6f7072ed-d96f-4aba-a28e-8fb7d806fe3c', 
  'e6855711-112b-492f-8659-1f57974da461', '1e0ca71f-8a3f-4b70-bf3b-32a6e6145dd0', 
  '3e0860c4-52f8-49f9-bd98-a3ee10eccd5e', '50401015-b46f-4c8e-933c-cc58bee04529', 
  '63cac8d5-de69-4676-88b6-688ebbd989d3', '106af2ae-6ab2-4804-a47e-994dae491966',
  '6456a525-2883-443c-b162-f067ddc2fbf7', '98f11a3d-d0d0-4501-bbe9-53fda1a440f5', 
  '6a08cb72-9726-42c7-b1f0-4d7d8b66c56c', 'faa616bc-a3aa-4321-9506-0e4f307c18f0',
  '8db60482-111d-4157-a198-d827e71f558f', '8d53b9a1-992e-4fdc-821a-dc0c4d4f88bb', 
  'abf35ea6-28b1-4649-add0-f58cdb27a4c1', 'c5252302-7db7-4667-8f77-98b0000616d0',
  '85ff52f4-8a9a-499f-8f0b-dc00147c0abf', 'fc8a5dc6-6191-495c-95cf-69a66259d332', 
  '014c0b82-54d1-41a4-a298-8ede987b60f2'
);