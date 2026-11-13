$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$outDir = Join-Path $PSScriptRoot '..\public\audio\listening'
$dataDir = Join-Path $PSScriptRoot '..\src\data\listening-cues'
$segmentDir = Join-Path $outDir '.segments'
New-Item -ItemType Directory -Force -Path $segmentDir, $dataDir | Out-Null

$materials = @(
  @{ slug = 'campus-library-tour'; lines = @(
    'Good morning, and welcome to the Riverside campus library. I am your guide, Emily Carter, and I will explain the main facilities before you explore on your own.'
    'The help desk is just inside the main entrance, beside the staircase. It opens at eight thirty on weekdays, and staff can help you find books or use the catalogue.'
    'Students may borrow up to six books at one time, and the usual loan period is three weeks. Please renew online before the due date, because overdue items may prevent you borrowing more.'
    'The quiet study room is on the second floor, opposite the computer area. Group rooms are on the third floor, and each room can hold up to eight students.'
    'To reserve a group room, use the library website. Reservations can be made up to two days in advance, and you will receive a confirmation email.'
    'Printers are beside the computers on the second floor. You can add credit to your student card at the machine near the printer, rather than at the help desk.'
    'Please return books in the blue box near the exit, even when the library is closed. Large books should be handed to staff during opening hours.'
    'The café is on the ground floor and closes at four thirty. I hope the library helps you settle into your studies.'
  ) }
  @{ slug = 'harbour-ferry-enquiry'; lines = @(
    'Good afternoon, Harbour Ferries. My name is Daniel. How can I help you today?'
    'I would like to book a return ticket to North Bay for Saturday, please. I am travelling with one friend.'
    'The first ferry leaves at nine fifteen, and the crossing takes about forty minutes. The next sailing is at ten thirty.'
    'Ten thirty would be better because we want to have breakfast first. Does the return ticket include both journeys?'
    'Yes, it does. A return ticket costs twenty eight pounds, and bicycles travel free. There is no need to reserve a bicycle space.'
    'That sounds good. Can I pay at the terminal, or do I need to pay online?'
    'You can pay at the terminal, but please arrive twenty minutes before departure. The ticket office is next to platform two.'
    'Is there a café on the ferry? My friend has a long journey to the harbour.'
    'There is a small café serving hot drinks and sandwiches. It opens as soon as the ferry leaves the harbour.'
  ) }
  @{ slug = 'community-garden-project'; lines = @(
    'Thank you for coming to the meeting about our community garden project. I am pleased to say that the council has approved our first year of work.'
    'We have received a small grant to improve the unused land behind the sports centre. The entrance will be through the gate on Willow Street.'
    'Our first task is to clear the site on the twelfth of May, not the fifth as we originally planned. We will meet at nine in the morning.'
    'Volunteers should bring gloves and wear comfortable shoes. The organisers will provide tools, drinking water and a basic first-aid kit.'
    'We will grow tomatoes, beans and herbs. The library has offered seeds, while the local college will lend us a water tank.'
    'The first planting beds will be built along the sunny wall. We will leave the shaded corner for a small seating area and a compost bin.'
    'Workshops will take place on Thursday evenings. Families are welcome, and children can help plant the herb beds with an adult.'
    'If you would like to join, please write your name on the list by the entrance before you leave. You can also ask to receive updates by email.'
  ) }
  @{ slug = 'student-residence-orientation'; lines = @(
    'Welcome to North Hall. I am Priya, one of the residence advisers, and I will show you where to check in and find the shared facilities.'
    'Reception is behind the café, through the glass doors on the east side of the building. Please use that entrance if you arrive after six in the evening.'
    'Your room is number two hundred and fourteen on the second floor. The lift is opposite the stairs, and your room key also opens the main entrance.'
    'Check-in begins at two oclock this afternoon. We ask for a refundable key deposit of sixty pounds, which will be returned when you move out.'
    'The laundry room is on the first floor beside the common kitchen. Tap your residence card on the machine to pay, and remember to collect your washing promptly.'
    'Breakfast is served in the dining room from seven until half past nine on weekdays. At weekends it is available until ten oclock.'
    'Quiet hours begin at ten oclock every evening. Please keep music low in the corridors, especially during the examination period.'
    'If you need help with heating or a repair, report it at reception rather than leaving a note on the door. We aim to respond within one working day.'
    'The nearest bus stop is across the road from the main entrance. The number twelve bus goes to the city centre every twenty minutes.'
  ) }
  @{ slug = 'river-volunteer-survey'; lines = @(
    'Thank you for joining the Riverwatch survey. I am Marco, the project coordinator, and today I will explain the route and the safety rules.'
    'We will meet at Oak Bridge, beside the small car park. Please do not wait at the visitor centre, because the path from there is closed for repairs.'
    'The survey will take place on the eighteenth of June. We moved it from the eleventh because the laboratory needs another week to prepare the equipment.'
    'Please arrive at nine fifteen for a short briefing. The first group will leave at half past nine, and the second group will start ten minutes later.'
    'Wear walking boots and bring a waterproof jacket. The riverbank can be muddy even when it has not rained recently.'
    'We will provide sample bottles, clipboards and gloves. Each team will also receive a map showing the three observation points.'
    'Before taking each sample, record the weather on the yellow form. Never enter the water alone; all measurements are taken from the bank.'
    'We will return to Oak Bridge at noon for lunch. Please bring your own food, as there are no shops within walking distance.'
    'The next training session is on Tuesday evening at the community centre. New volunteers can practise using the water-testing kit there.'
  ) }
)

foreach ($material in $materials) {
  $synth = [System.Speech.Synthesis.SpeechSynthesizer]::new()
  $voice = $synth.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Name -like '*Zira*' } | Select-Object -First 1
  if (-not $voice) { throw 'The Microsoft Zira en-US voice is required to regenerate these recordings.' }
  $synth.SelectVoice($voice.VoiceInfo.Name)
  $synth.Rate = -1
  $synth.Volume = 100
  foreach ($index in 0..($material.lines.Count - 1)) {
    $synth.SetOutputToNull()
    $segmentPath = Join-Path $segmentDir ("$($material.slug)-$index.wav")
    $synth.SetOutputToWaveFile($segmentPath)
    $synth.Speak($material.lines[$index])
  }
  $synth.SetOutputToNull()
  $synth.Dispose()
}

$manifestPath = Join-Path $segmentDir 'manifest.json'
[System.IO.File]::WriteAllText($manifestPath, (ConvertTo-Json -InputObject @($materials) -Depth 4), [System.Text.UTF8Encoding]::new($false))
& python (Join-Path $PSScriptRoot 'assemble-listening-audio.py') $segmentDir $outDir $dataDir
if ($LASTEXITCODE -ne 0) { throw 'Audio assembly failed.' }
