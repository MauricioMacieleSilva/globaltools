-- Remove remaining duplicate activities from September 8th, 2025
DELETE FROM lead_activities 
WHERE id IN (
  '76ea5e51-e7fa-4f75-bd38-0340fbffa955', 
  '10a57c71-4329-4923-81ec-bf1322860db7', 
  '382927e6-3a34-4110-9e21-5b7d6c6ce5b2', 
  '4ba8c197-4c2a-4e5c-ad32-a0aa39010f43',
  '6c66ec0f-5ac4-4ee3-8574-a80fdc7b249b', 
  '4a4e9537-d56e-4cec-8338-fa0c60858d3e', 
  '2825014c-f85b-495b-bc35-a1a5a839e8de', 
  'c3133037-1bb7-4187-b60c-5d1aad8d1bd8',
  '34c1c151-b1b2-4225-b5fe-02aabd7a7d48', 
  '5e97d6a0-9c37-4875-8317-f348ab023369', 
  'a243127e-06e5-4db2-a438-db5afaba3795', 
  '6734a7c7-d526-452a-9dd3-61d6848d04aa',
  '3540dcd5-632d-4d11-99ed-686b2cd91fe8',
  '7c303fed-3ecf-47c2-b326-ff16f6fe9c30',
  '88c2061c-a2d3-4633-a9d6-ef8efeb03c3b'
);