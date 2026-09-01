# Fitness evaluation 

I wanna create a gym evaluation app.
I do each evaluation compiling my notebook and putting in a word. Then i export to pdf and i send to my clients.
But this was very slow to do. Because of this, i wanna create a app (mac/windows focused), but i want to add support to phones android/ios (make it responsive).

# Objetives
1. The system will be in portuguese (brazilian)
2. The system not needs login, only the personal will have access to it.
3. The system needs to generate a PDF with evolution, this evaluations will be sent in whatsApp to the members
4. The system will have two main components: members and evaluation.
5. Each member have:
 - name
 - phone
 - birthday
 - gender
 - face photo (optional with default if user not have)
6. Each evaluation have (list in portuguese with example):
 - Data da Avaliação: 23/07/2026
 - Avaliação Número: 1
 - Peso: 66.9kg
 - Medidas de Perímetros em (cm):
   - Pescoço: 37.0
   - Tórax: 87.0
   - Cintura: 78.5
   - Abdômen: 85.5
   - Quadril: 96.0
   - Antebraço Direito: 25.0
   - Antebraço Esquerdo: 24.5
   - Braço Direito: 28.0
   - Braço Esquerdo: 26.5
   - Coxa Direita: 47.5
   - Coxa Esquerda: 47.5
   - Panturrilha Direta: 33.5
   - Panturrilha Esquerda: 33.5
   - Braço Contraído Direto: 29.0
   - Braço Contraído Esquerdo: 27.5
   - Altura: 1,80m
 - Medidas de Bioimpedância:
   - Frequência Cardíaca: 88 bpm
   - Índice de coração: 3.4L/Min/m²
   - IMC (Índice de massa corpórea): 20.6
   - Gordura corporal: 17.2%
   - Taxa Muscular: 78.4%
   - Massa Livre de Gordura: 55.4kg
   - Gordura Subcutânea: 12.3%
   - Gordura Visceral: 5.5
   - Água Corporal: 54.6%
   - Massa Muscular Esquelética: 44.2%
   - Massa Muscular: 52.4kg
   - Massa Óssea: 2.9kg
   - TMB (Taxa do Metabolismo Basal): 1.559kcal
   - Idade Metabólica: 24 anos
 - Foto frontal
 - Foto lateral direita
 - Foto lateral esquerda
 - Foto de costas
7. PDF avaliation generation should has:
 - By default the pdf generation compares in tables he first avaliation with the two last ones (if user has 3 or more avaliations). If user has one avaliation (first, generate without comparisisson). If user has two (compare this 2 avaliations).
 - Compare the photos of 3 avaliations (first and two last ones), putting them side by side.
 - On the end of gym avaliation, put graphs with full data (not only of 3 selected on table, with complete evolution)
8. The app for the personal trainer for each user should have 3 tabs inside member: member data with edit button, evaluation menu (that user can select which avaliation it can see or edit or add or generate, with default last one). And evolution menu, that show in graphs all the member metrics in graphs, and carrouseel to photos. 
9. The button of generate PDF should open a menu that show a list with the first and two last one avaliations (if user has 3 or more avaliations). The personal trainer can edit the avaliations selected (if they want compare with others avaliations). Also add a button of delete from list, that remove this avaliation from comparisson, if personal want to compare only two avaliations, or if delete 2, show only avaliation result (without comparisson.)

# System
The system should be using tauri. 
The database should be embedded on the app (maybe a embedded SQLite).


# missing features
(none currently)