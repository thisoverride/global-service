# Télévision : Messages TV et CrackStreams TV

Deux modules autonomes sont découverts automatiquement par `ModuleLoader`.
Ils utilisent le compte administrateur et la table `module_settings` existants.
Aucune migration supplémentaire, aucun second service Python et aucun démarrage
automatique sur le Mac ne sont nécessaires.

## Développement sur le Mac

```sh
npm ci
npm run dev:tv
```

Ouvrir <http://localhost:8788/>. Ce lanceur ne démarre que les deux modules TV,
avec des réglages locaux privés dans `.local-tv/` (ignoré par Git et Docker).
L'administration est accessible uniquement depuis le Mac. La TV peut joindre
les routes `/devices/crackstreams` sur le réseau local. L'adresse réseau du Mac
est affichée dans le module. `Ctrl+C` arrête le serveur. Aucun service système
n'est créé. `TV_DEV_PORT` et `TV_DEV_STATE` permettent de déplacer le port et les
données de développement.

Pour réutiliser une association de l'ancien service Python sur ce Mac :

```sh
TV_IMPORT_STATE=/chemin/prive/config.json npm run dev:tv
```

L'import ne s'effectue que si aucune association n'existe encore. Il conserve
l'adresse, la clé et l'empreinte TLS, sans les afficher. Il ne copie pas le code
d'accès de l'ancien serveur. En production, effectuer un nouvel appairage depuis
la console ; les données de développement ne sont jamais embarquées dans l'image.

## Messages TV

Dans **Services → Messages TV**, enregistrer l'adresse IP privée de la TV,
cliquer sur **Associer la TV**, puis accepter à l'écran. La touche **Vérifier**
teste la connexion sans afficher de message. Les notifications utilisent SSAP
sur TLS (port 3001) et demandent uniquement `WRITE_NOTIFICATION_TOAST`.

Le certificat est mémorisé au premier appairage validé. Sa modification bloque
la connexion avant tout envoi de clé. La réinitialisation est une action séparée.
Une seule opération TV s'exécute à la fois. Les messages comportent au maximum
500 caractères, avec deux secondes entre envois. Le succès exige l'accusé de
réception positif de la TV ; il ne prouve pas qu'une personne l'a lu.

Les dix derniers messages restent uniquement en mémoire. Durée, position et
visibilité de la notification sont gérées par webOS ; certaines applications
peuvent les masquer. Le transport Node est une implémentation indépendante du
service Python antérieur. Aucun code de root n'est inclus.

## Application CrackStreams TV

```sh
npm run package:tv
```

L'outil officiel LG, épinglé dans les dépendances de développement, produit
`dist/com.dalency.crackstreams_1.0.0_all.ipk`. Ce paquet ne contient ni clé TV,
ni jeton d'accès, ni adresse privée imposée. Installer avec un appareil configuré
dans webOS CLI / webOS Dev Manager, ou avec le mécanisme d'installation de
Homebrew déjà présent sur la TV. Ne pas installer LG Developer Mode sur une TV
rootée pour cette opération.

1. Ouvrir l'application **CrackStreams TV** sur la télévision.
2. Dans la console **Services → CrackStreams TV**, générer un code.
3. Sur la TV, saisir l'adresse de Global Service (pas `localhost`) et le code.
4. Naviguer avec les flèches et OK, ou avec le pointeur de la Magic Remote.

Le code à huit chiffres expire après cinq minutes et ne s'utilise qu'une fois.
Il donne un accès en lecture à la configuration et au catalogue, sans droits
d'administration ni permission d'envoyer des notifications. Un nouvel appairage
remplace le jeton précédent. Seules ses empreintes sont stockées côté serveur.
La révocation est disponible dans la console. Les tentatives sont limitées par
adresse et globalement en mémoire ; utiliser une seule instance ou une limite
partagée au proxy en cas de déploiement multi-instance.

Pour changer de domaine, modifier **Adresse du site** dans la console puis
enregistrer. L'application consulte sa configuration toutes les 60 secondes
lorsqu'elle est visible et à son retour sur l'accueil. Une modification ne coupe
pas une page en cours : elle est utilisée lors de la prochaine ouverture. Une
dernière configuration peut être utilisée hors connexion ; les nouveaux
catalogues et les changements nécessitent le serveur. Une révocation ne peut
pas supprimer à distance un site déjà ouvert.

Le catalogue ne récupère que les liens publics de catégories et de diffusion,
avec un cache d'une minute. Il ne lance aucun script du site côté serveur et
n'injecte pas son HTML dans l'interface. Liens de pied de page et articles
promotionnels sont exclus. Les liens externes au domaine configuré sont exclus
du catalogue. Le récupérateur limite la taille, les délais, les redirections et
les IP publiques, et fixe l'adresse DNS au socket pour éviter une redirection
vers le réseau privé. Les sous-chemins reconnus sont `/league/…` et `/stream/…` ;
si le site change sa structure, le bouton **Ouvrir le site** reste disponible.

### Publicités et lecture

L'accueil et le lecteur TV n'intègrent ni publicité, ni discussion, ni page du
site. Quand une diffusion est choisie, le serveur inspecte seulement le HTML et
les données de lecteur déjà annoncées, sans exécuter les scripts du site. Il
recherche une playlist HLS publique puis retransmet temporairement cette
playlist et ses segments à la TV avec un ticket aléatoire, limité à l'association
active et supprimé à la révocation ou à l'expiration. Les URL de ces tickets
sont masquées dans les journaux HTTP.

La TV utilise son lecteur vidéo natif lorsque possible, sinon la version locale
de hls.js. Les playlists HLS courantes sont prises en charge ; DASH, DRM et les
lecteurs qui exigent une connexion ou une étape anti-robot ne le sont pas. Aucune
protection d'accès, DRM ou paywall n'est contourné. Une publicité intégrée à la
vidéo elle-même ne peut pas être retirée. Si aucun flux direct compatible n'est
trouvé, l'application affiche une explication et propose de revenir au catalogue.
Le serveur limite les domaines aux adresses publiques, les tailles, délais, les
redirections et les lectures simultanées.

## Production et Docker

Le lancement habituel de Global Service conserve PostgreSQL, la session
administrateur et la découverte des modules. Le Dockerfile copie aussi
`tv-app/`, nécessaire à l'aperçu web. Le build copie les vues avec un script Node
portable (remplace `cp --parents`, indisponible sur macOS).

Les seuls ajouts publics sont les fichiers de l'application et l'API d'appareil
explicitement isolée sous `/devices/crackstreams`. Les routes `/modules/…`
restent protégées par `requireAuth`, y compris les nouveaux modules. Les
écritures des modules TV exigent une origine identique. L'API TV n'accepte pas
les cookies de la console et exige un jeton Bearer, sauf pour l'échange du code.
Elle accepte l'origine opaque `null` des applications webOS empaquetées, ou
l'origine de la console pour l'aperçu.

En dehors du réseau local, utiliser HTTPS. En production, clés d'association et
empreintes résident dans la base de données privée ; protéger les sauvegardes
comme celles des autres modules contenant des identifiants. Le service doit
pouvoir joindre la TV sur le réseau local et le site sur HTTPS. L'option
`TV_HOST` fournit seulement l'adresse initiale avant enregistrement en base.

## Vérification

```sh
npm test
npm run package:tv
```

Les tests utilisent un serveur TV TLS/SSAP simulé et de véritables requêtes HTTP
locales. Ils vérifient les certificats, les confirmations de notification, la
validation des messages, la concurrence, les codes et leur expiration, la
révocation, les origines, les restrictions réseau et la protection des modules
par le chargeur réel. Ils n'affirment pas qu'un flux sportif réel a été lu.

Références : [format d'application LG](https://webostv.developer.lge.com/develop/references/appinfo-json),
[bouton Retour webOS](https://webostv.developer.lge.com/develop/guides/back-button),
[outil officiel LG](https://webostv.developer.lge.com/develop/tools/cli-introduction),
[restrictions des cadres HTML](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe).
