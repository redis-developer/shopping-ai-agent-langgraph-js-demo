# AWS Bedrock Guardrails Configuration

This document provides comprehensive topic filter definitions and example phrases for configuring AWS Bedrock Guardrails to block off-topic conversations in a grocery shopping assistant.

## Overview

The guardrail system uses two layers of protection:
1. **AWS Bedrock Guardrails** → Blocks harmful/inappropriate content
2. **Custom Topic Validation** → Blocks off-topic but harmless requests

## Topic Filter Definitions

### Medical Advice & Health Diagnosis

**Definition:** User requests seeking medical diagnosis, treatment recommendations, medication advice, symptom interpretation, or health condition management. Includes requests for dosage information, drug interactions, medical test result interpretation, or therapeutic guidance.

**Example Phrases:**

```
English:

"I have a headache, what medicine should I take?"
"My blood pressure is 140/90, is this dangerous?"
"Can you diagnose my stomach pain?"
"What antibiotics should I take for my cold?"
"I think I have diabetes, what are the symptoms?"
"Should I take Paracetamol or Ibuprofen for fever?"
"My knee hurts when I walk, what's wrong?"
"Can turmeric cure my arthritis?"
"I'm feeling depressed, what should I do?"
"My child has a rash, should I see a doctor?"
"What's the right dosage of vitamin D?"
"I have chest pain, is this a heart attack?"
"Can you interpret my blood test results?"
"What foods will cure my high cholesterol?"
"I'm pregnant, what medicines are safe?"

Hinglish:

"Yaar, mera sir dukh raha hai, kya medicine lun?"
"Bhai, mera BP 140/90 hai, kya dangerous hai?"
"Didi, pet mein dard hai, kya problem ho sakti hai?"
"Mere cold ke liye kya antibiotics lena chahiye?"
"Mujhe lagta hai diabetes hai, symptoms kya hote hain?"
"Fever ke liye Crocin lun ya Combiflam?"
"Ghutne mein pain ho raha hai walking karte time"
"Kya haldi se arthritis theek ho sakta hai?"
"Yaar, depression feel kar raha hun, kya karun?"
"Mere bachhe ko rash hai, doctor ke paas jana chahiye?"
"Vitamin D ki kitni dose leni chahiye?"
"Chest mein pain hai, heart attack toh nahi?"
"Mere blood test ka report samjha do"
"High cholesterol ke liye kya khana chahiye?"
"Main pregnant hun, kya medicines safe hain?"
```

---

### Financial Services & Investment Advice

**Definition:** User requests seeking investment recommendations, financial planning guidance, market analysis, trading advice, or monetary decision-making assistance. Includes stock picks, cryptocurrency advice, loan guidance, or economic predictions.

**Example Phrases:**

```
English:

"Should I invest in Bitcoin right now?"
"What stocks should I buy today?"
"How do I plan my retirement savings?"
"Is it a good time to buy gold?"
"Should I take a personal loan?"
"What's the best mutual fund to invest in?"
"How do I reduce my taxes this year?"
"Should I buy or rent a house?"
"What's the best credit card for me?"
"How do I start trading in the stock market?"
"Is cryptocurrency a good investment?"
"Should I invest in real estate?"
"What's the current interest rate for loans?"
"How do I improve my credit score?"
"Should I invest in SIP or lump sum?"

Hinglish:

"Bhai, Bitcoin mein invest karna chahiye abhi?"
"Kaun sa stock buy karna chahiye aaj?"
"Retirement ke liye paisa kaise save karun?"
"Gold buy karne ka time hai kya?"
"Personal loan lena chahiye ya nahi?"
"Best mutual fund kaun sa hai invest karne ke liye?"
"Tax kam kaise karun is year?"
"Ghar buy karun ya rent pe rahun?"
"Mere liye best credit card kaun sa hai?"
"Share market mein trading kaise start karun?"
"Cryptocurrency mein investment safe hai kya?"
"Property mein invest karna chahiye?"
"Loan ka interest rate kitna chal raha hai?"
"Credit score kaise improve karun?"
"SIP mein invest karun ya lump sum?"
```

---

### Technical Support & Device Troubleshooting

**Definition:** User requests for assistance with electronic devices, software applications, computer systems, vehicles, or mechanical equipment. Includes troubleshooting steps, repair guidance, or technical configuration help for non-cooking appliances.

**Example Phrases:**

```
English:

"My laptop won't start, how do I fix it?"
"How do I connect my phone to WiFi?"
"My car engine is making strange noises"
"How do I install Windows on my computer?"
"My iPhone screen is cracked, what should I do?"
"How do I reset my router?"
"My printer is not working properly"
"How do I backup my phone data?"
"My TV remote is not responding"
"How do I fix a flat tire?"
"My air conditioner is not cooling"
"How do I update my phone software?"
"My computer is running very slowly"
"How do I fix my washing machine?"
"My internet connection keeps dropping"

Hinglish:

"Yaar, mera laptop start nahi ho raha, kaise fix karun?"
"Phone ko WiFi se kaise connect karun?"
"Mere car ka engine weird noise kar raha hai"
"Computer mein Windows kaise install karun?"
"iPhone ka screen crack ho gaya, kya karun?"
"Router ko reset kaise karun?"
"Printer properly work nahi kar raha"
"Phone ka data backup kaise karun?"
"TV remote respond nahi kar raha"
"Flat tire kaise fix karun?"
"AC cooling nahi kar raha properly"
"Phone ka software update kaise karun?"
"Computer bahut slow chal raha hai"
"Washing machine kaise theek karun?"
"Internet connection bar bar disconnect ho raha hai"
```

---

### Academic Assistance & Educational Content

**Definition:** User requests for homework completion, assignment help, educational explanations, or academic research assistance in subjects unrelated to food, cooking, or nutrition. Includes test preparation, essay writing, or coursework support.

**Example Phrases:**

```
English:

"Help me solve this math equation: 2x + 5 = 15"
"Explain the theory of relativity"
"Write an essay about climate change"
"What caused World War II?"
"Help me with my chemistry homework"
"Explain photosynthesis process"
"What's the capital of Australia?"
"Help me prepare for my physics exam"
"Solve this calculus problem for me"
"Explain the water cycle"
"What's the difference between mitosis and meiosis?"
"Help me write a research paper"
"What are the causes of the French Revolution?"
"Explain quantum mechanics"
"Help me with my English literature assignment"

Hinglish:

"Yaar, ye math equation solve kar do: 2x + 5 = 15"
"Theory of relativity explain kar do"
"Climate change pe essay likhna hai help karo"
"World War II kyun hua tha?"
"Chemistry ka homework help kar do"
"Photosynthesis process samjha do"
"Australia ki capital kya hai?"
"Physics exam ke liye prepare karna hai"
"Ye calculus problem solve kar do"
"Water cycle explain kar do"
"Mitosis aur meiosis mein kya difference hai?"
"Research paper likhne mein help kar do"
"French Revolution ke causes kya the?"
"Quantum mechanics samjha do"
"English literature assignment mein help chahiye"
```

---

### Weather, News & Current Events

**Definition:** User requests for weather forecasts, news updates, current events, political information, or real-time information about non-food related topics. Includes sports scores, entertainment news, or breaking news inquiries.

**Example Phrases:**

```
English:

"What's the weather like today?"
"Will it rain tomorrow?"
"What's happening in the news?"
"Who won the election?"
"What's the latest on COVID-19?"
"Tell me about current events"
"What's the temperature outside?"
"Is there a storm coming?"
"What's trending on social media?"
"What happened in politics today?"
"Give me the latest news updates"
"What's the weather forecast for this week?"
"Tell me about recent world events"
"What's the current situation in Ukraine?"
"Any breaking news today?"

Hinglish:

"Aaj weather kaisa hai?"
"Kal baarish hogi kya?"
"News mein kya chal raha hai?"
"Election mein kaun jeeta?"
"COVID-19 ka latest update kya hai?"
"Current events ke baare mein batao"
"Bahar temperature kitna hai?"
"Storm aane wala hai kya?"
"Social media pe kya trending hai?"
"Politics mein aaj kya hua?"
"Latest news updates de do"
"Is week ka weather forecast kya hai?"
"Recent world events ke baare mein batao"
"Ukraine mein kya situation hai abhi?"
"Koi breaking news hai aaj?"
```

---

### Sports & Entertainment

**Definition:** User requests for sports-related information, entertainment content, gaming advice, or recreational activities unrelated to food preparation or dining. Includes match results, player statistics, movie reviews, or gaming strategies.

**Example Phrases:**

```
English:

"Who won the cricket match yesterday?"
"What's the score of today's football game?"
"Tell me about the latest Bollywood movie"
"Who won the IPL match?"
"What are Virat Kohli's latest stats?"
"Which team is leading in the Premier League?"
"Tell me about the new Marvel movie"
"Who won the tennis tournament?"
"What's the latest episode of my favorite show about?"
"Which team will win the World Cup?"
"Tell me about celebrity gossip"
"What movies are releasing this weekend?"
"Who's performing at the concert tonight?"
"What's the latest gaming news?"
"Tell me about the Olympics results"

Hinglish:

"Kal cricket match mein kaun jeeta?"
"Aaj ke football game ka score kya hai?"
"Latest Bollywood movie ke baare mein batao"
"IPL match mein kaun jeeta?"
"Virat Kohli ke latest stats kya hain?"
"Premier League mein kaun sa team lead kar raha hai?"
"Naya Marvel movie ke baare mein batao"
"Tennis tournament mein kaun jeeta?"
"Mere favorite show ka latest episode kya tha?"
"World Cup mein kaun sa team jeetega?"
"Celebrity gossip kya chal raha hai?"
"Is weekend kya movies release ho rahi hain?"
"Aaj raat concert mein kaun perform kar raha hai?"
"Gaming ki latest news kya hai?"
"Olympics ke results kya hain?"
```

---

### Professional Services & Legal Advice

**Definition:** User requests for legal guidance, professional consultation, business advice, or specialized service recommendations outside the food and grocery domain. Includes legal interpretation, business strategy, or professional referrals.

**Example Phrases:**

```
English:

"Can I sue my neighbor for noise?"
"What are my rights as a tenant?"
"How do I file for divorce?"
"Is this contract legally binding?"
"What should I do about workplace harassment?"
"How do I start a business?"
"What are the tax implications of this?"
"Can I get fired for this reason?"
"How do I patent my invention?"
"What's the legal age for marriage?"
"How do I write a will?"
"What are my consumer rights?"
"Can I break this lease agreement?"
"How do I register a trademark?"
"What should I do about a car accident?"

Hinglish:

"Neighbor ko noise ke liye sue kar sakta hun?"
"Tenant ke rights kya hain mere?"
"Divorce kaise file karun?"
"Ye contract legally binding hai kya?"
"Workplace harassment ke baare mein kya karun?"
"Business kaise start karun?"
"Iske tax implications kya hain?"
"Is reason se fired ho sakta hun kya?"
"Apna invention patent kaise karun?"
"Marriage ki legal age kya hai?"
"Will kaise likhun?"
"Consumer rights kya hain mere?"
"Lease agreement break kar sakta hun?"
"Trademark register kaise karun?"
"Car accident ke baad kya karun?"
```

---

### Scientific Research & General Knowledge

**Definition:** User requests for scientific explanations, research findings, or general knowledge topics unrelated to food science, nutrition, or culinary arts. Includes physics, chemistry, biology, or other scientific domains outside food context.

**Example Phrases:**

```
English:

"How does gravity work?"
"What's the speed of light?"
"Explain black holes"
"How old is the universe?"
"What causes earthquakes?"
"How do magnets work?"
"What's the periodic table?"
"Explain DNA structure"
"How do airplanes fly?"
"What causes lightning?"
"How does the human brain work?"
"What's the largest planet?"
"How do vaccines work?"
"What causes global warming?"
"How do computers process information?"

Hinglish:

"Gravity kaise kaam karta hai?"
"Light ki speed kitni hai?"
"Black holes explain kar do"
"Universe kitna purana hai?"
"Earthquake kyun aate hain?"
"Magnets kaise kaam karte hain?"
"Periodic table kya hai?"
"DNA structure explain kar do"
"Airplane kaise udta hai?"
"Lightning kyun hoti hai?"
"Human brain kaise kaam karta hai?"
"Sabse bada planet kaun sa hai?"
"Vaccines kaise kaam karte hain?"
"Global warming kyun ho raha hai?"
"Computer information kaise process karta hai?"
```

---

### Personal Relationships & Life Advice

**Definition:** User requests for relationship counseling, personal life guidance, emotional support, or interpersonal advice. Includes dating suggestions, family conflict resolution, or personal decision-making assistance unrelated to food choices.

**Example Phrases:**

```
English:

"My boyfriend is cheating on me, what should I do?"
"How do I deal with my difficult mother-in-law?"
"Should I break up with my girlfriend?"
"How do I make friends as an adult?"
"My marriage is falling apart, help me"
"How do I deal with workplace bullying?"
"Should I move to another city for work?"
"How do I handle my teenage daughter?"
"My friend betrayed me, what should I do?"
"How do I deal with loneliness?"
"Should I have children?"
"How do I cope with my parents' divorce?"
"My boss is being unfair to me"
"How do I build confidence?"
"Should I quit my job?"

Hinglish:

"Mera boyfriend cheating kar raha hai, kya karun?"
"Difficult saas se kaise deal karun?"
"Girlfriend se breakup karna chahiye?"
"Adult age mein friends kaise banayun?"
"Meri marriage fail ho rahi hai, help karo"
"Office mein bullying ho rahi hai, kya karun?"
"Job ke liye dusre city move karna chahiye?"
"Teenage daughter ko kaise handle karun?"
"Mere friend ne betray kiya, kya karun?"
"Loneliness se kaise deal karun?"
"Bachhe karne chahiye ya nahi?"
"Parents ke divorce se kaise cope karun?"
"Mera boss unfair hai mere saath"
"Confidence kaise build karun?"
"Job quit kar dun kya?"
```

## Test Cases

### Should PASS (Grocery/Food Related):

```
English:

"I need ingredients for butter chicken"
"Help me find gluten-free pasta"
"What spices do I need for biryani?"
"I want to meal prep for the week"
"Show me healthy breakfast options"
"I need ingredients for a birthday cake"
"Help me find dairy-free alternatives"
"What vegetables are good for stir fry?"

Hinglish:

"Butter chicken ke liye ingredients chahiye"
"Gluten-free pasta dhundne mein help karo"
"Biryani ke liye kya spices chahiye?"
"Week bhar ka meal prep karna hai"
"Healthy breakfast options dikhao"
"Birthday cake ke liye ingredients chahiye"
"Dairy-free alternatives dhundne mein help karo"
"Stir fry ke liye kya vegetables achhe hain?"
```

### Should be BLOCKED (Off-Topic):

All the example phrases listed in the topic categories above should be blocked.

### Edge Cases to Test:

```
Food-adjacent but medical (should be blocked):

English:

"What foods cure diabetes?"
"Can turmeric treat my arthritis?"
"What should I eat to lose 10kg in a week?"

Hinglish:

"Diabetes ke liye kya khana chahiye cure ke liye?"
"Haldi se arthritis theek ho sakta hai?"
"10kg weight loss ke liye kya khana chahiye?"

Cooking but off-topic (should pass):

English:

"I want to cook like Gordon Ramsay"
"Help me make restaurant-style food at home"
"What ingredients make food taste like my grandmother's cooking?"

Hinglish:

"Gordon Ramsay ki tarah cooking karna hai"
"Ghar mein restaurant style food banane mein help karo"
"Nani ke khane jaisa taste kaise layun?"
```

## Implementation Guidelines

### AWS Bedrock Guardrail Configuration:

1. **Use these phrases as training examples** in your topic filter definitions
2. **Set sensitivity to "High"** to catch variations of these phrases
3. **Include both English and Hinglish variations** - All example phrases above now include both languages

4. **Test with variations** like:
   - Misspellings: "wat medicin shud i tak?" / "kya medisn lena chahiye?"
   - Casual language: "dude my phone's acting weird" / "yaar phone weird behave kar raha hai"
   - Indirect requests: "asking for a friend about investment advice" / "friend ke liye puch raha hun investment ke baare mein"
   - Mixed languages: "Mera laptop won't start, kaise fix karun?"

### Custom Response Messages:

When a topic is blocked, redirect users with messages like:

```
"I'm a grocery shopping assistant focused on helping you find ingredients, plan meals, and answer cooking-related questions. 

For [specific topic], I'd recommend consulting appropriate specialists or resources. 

How can I help you with your grocery shopping or cooking needs today?"
```

## Configuration Steps

1. **In AWS Bedrock Console:**
   - Navigate to Guardrails
   - Create/Edit your guardrail
   - Add Topic Filters for each category above
   - Set Action to "Block"
   - Use the example phrases as training data

2. **In Your Application:**
   - Implement the enhanced front desk agent logic
   - Test with the provided example phrases
   - Monitor logs for false positives/negatives
   - Adjust sensitivity as needed

## Monitoring & Maintenance

- **User Feedback:** Monitor user complaints about blocked legitimate requests
- **Continuous Improvement:** Add new example phrases based on real user interactions
